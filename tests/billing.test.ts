import { describe, expect, it, vi } from 'vitest';
import {
  PACKAGE_TYPE,
  PRODUCT_CATEGORY,
  PRODUCT_TYPE,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import {
  Billing,
  billingError,
  hasPremium,
  type BillingGateway,
  type EntitlementInfo,
} from '../src/billing';

const free: EntitlementInfo = { entitlements: { active: {} } };
const paid: EntitlementInfo = {
  entitlements: {
    active: { steady_plus: { isActive: true, expirationDate: null } },
  },
};
const lifetime: PurchasesPackage = {
  identifier: '$rc_lifetime',
  packageType: PACKAGE_TYPE.LIFETIME,
  offeringIdentifier: 'default',
  webCheckoutUrl: null,
  presentedOfferingContext: {
    offeringIdentifier: 'default',
    placementIdentifier: null,
    targetingContext: null,
  },
  product: {
    identifier: 'steady_plus_lifetime',
    description: 'Three stretch rehearsals',
    title: 'Steady Plus',
    price: 7.99,
    priceString: '$7.99',
    currencyCode: 'USD',
    introPrice: null,
    discounts: null,
    productCategory: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    productType: PRODUCT_TYPE.CONSUMABLE,
    subscriptionPeriod: null,
    defaultOption: null,
    subscriptionOptions: null,
    presentedOfferingContext: null,
    presentedOfferingIdentifier: null,
    pricePerWeek: null,
    pricePerMonth: null,
    pricePerYear: null,
    pricePerWeekString: null,
    pricePerMonthString: null,
    pricePerYearString: null,
  },
};
function gateway() {
  return {
    configure: vi.fn(async () => {}),
    getOfferings: vi.fn(async () => ({
      current: { availablePackages: [lifetime] },
    })),
    getCustomerInfo: vi.fn(async () => ({ customerInfo: free })),
    purchasePackage: vi.fn(async () => ({ customerInfo: paid })),
    restorePurchases: vi.fn(async () => ({ customerInfo: paid })),
    addCustomerInfoUpdateListener: vi.fn(
      async (_callback: (info: EntitlementInfo) => void) => 'listener-one',
    ),
    removeCustomerInfoUpdateListener: vi.fn(async () => ({ wasRemoved: true })),
  } satisfies BillingGateway;
}

describe('real SDK purchase boundary (gateway mocked, no real charge)', () => {
  it('never configures the native SDK or offers a mock purchase on the web', async () => {
    const sdk = gateway();
    const billing = new Billing(sdk, 'web', 'goog_publicKey');
    expect(billing.availability).toContain('Browser preview');
    await expect(billing.customer()).rejects.toThrow('Browser preview');
    await expect(billing.purchase('$rc_lifetime')).rejects.toThrow();
    expect(sdk.configure).not.toHaveBeenCalled();
    expect(sdk.purchasePackage).not.toHaveBeenCalled();
  });
  it.each(['', 'sk_secret', '$(some-command)', 'goog_bad key'])(
    'rejects missing, secret or malformed SDK key %s',
    async (key) => {
      const sdk = gateway();
      await expect(new Billing(sdk, 'android', key).customer()).rejects.toThrow(
        'not configured',
      );
      expect(sdk.configure).not.toHaveBeenCalled();
    },
  );
  it('uses the actual offering package, localized price, returned entitlement, and configure-once', async () => {
    const sdk = gateway();
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await Promise.all([billing.customer(), billing.customer()]);
    const packages = await billing.offerings();
    expect(packages[0].product.priceString).toBe('$7.99');
    expect(hasPremium(await billing.purchase('$rc_lifetime'))).toBe(true);
    expect(sdk.purchasePackage).toHaveBeenCalledWith({ aPackage: lifetime });
    expect(sdk.configure).toHaveBeenCalledTimes(1);
  });
  it('retries failed configuration without caching a rejected initialization forever', async () => {
    const sdk = gateway();
    sdk.configure.mockRejectedValueOnce(new Error('offline'));
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await expect(billing.customer()).rejects.toThrow('offline');
    await expect(billing.customer()).resolves.toEqual(free);
    expect(sdk.configure).toHaveBeenCalledTimes(2);
  });
  it('only supports non-renewing lifetime products and reports empty offerings', async () => {
    const sdk = gateway();
    sdk.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [{ ...lifetime, packageType: PACKAGE_TYPE.MONTHLY }],
      },
    });
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await expect(billing.offerings()).rejects.toThrow('unavailable');
    await expect(billing.purchase('$rc_lifetime')).rejects.toThrow(
      'currently available',
    );
  });
  it('cannot buy an arbitrary product identifier', async () => {
    const sdk = gateway();
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await billing.offerings();
    await expect(billing.purchase('attacker-product')).rejects.toThrow(
      'available',
    );
    expect(sdk.purchasePackage).not.toHaveBeenCalled();
  });

  it('invalidates stale packages when an offering refresh fails', async () => {
    const sdk = gateway();
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await billing.offerings();
    sdk.getOfferings.mockRejectedValueOnce(new Error('offline'));
    await expect(billing.offerings()).rejects.toThrow('offline');
    await expect(billing.purchase('$rc_lifetime')).rejects.toThrow('available');
    expect(sdk.purchasePackage).not.toHaveBeenCalled();
  });
  it('does not grant access on cancellations, pending payments or missing entitlements', async () => {
    const sdk = gateway();
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await billing.offerings();
    sdk.purchasePackage.mockRejectedValueOnce({ userCancelled: true });
    await expect(billing.purchase('$rc_lifetime')).rejects.toEqual({
      userCancelled: true,
    });
    sdk.purchasePackage.mockResolvedValueOnce({ customerInfo: free });
    expect(hasPremium(await billing.purchase('$rc_lifetime'))).toBe(false);
    expect(billingError({ userCancelled: true })).toContain('cancelled');
    expect(billingError({ code: '20' })).toContain('pending');
    expect(billingError(new Error('private diagnostic'))).not.toContain(
      'private diagnostic',
    );
  });
  it('restores from SDK results and applies revocation or expiry, never a local premium flag', async () => {
    const sdk = gateway();
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    expect(hasPremium(await billing.restore())).toBe(true);
    expect(hasPremium(free)).toBe(false);
    expect(
      hasPremium({
        entitlements: {
          active: { steady_plus: { isActive: false, expirationDate: null } },
        },
      }),
    ).toBe(false);
    expect(
      hasPremium(
        {
          entitlements: {
            active: {
              steady_plus: {
                isActive: true,
                expirationDate: '2026-09-15T10:00:00Z',
              },
            },
          },
        },
        Date.parse('2026-09-15T10:00:00Z'),
      ),
    ).toBe(false);
    expect(
      hasPremium({
        entitlements: {
          active: {
            steady_plus: { isActive: true, expirationDate: 'invalid' },
          },
        },
      }),
    ).toBe(false);
  });
  it('subscribes to SDK customer updates and removes the exact listener on cleanup', async () => {
    const sdk = gateway();
    const listener = vi.fn();
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    const remove = await billing.listen(listener);
    sdk.addCustomerInfoUpdateListener.mock.calls[0][0](paid);
    expect(listener).toHaveBeenCalledWith(paid);
    await remove();
    expect(sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith({
      listenerToRemove: 'listener-one',
    });
  });
  it('prevents overlapping purchase and restore transactions', async () => {
    const sdk = gateway();
    let finish:
      ((value: { customerInfo: EntitlementInfo }) => void) | undefined;
    sdk.purchasePackage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const billing = new Billing(sdk, 'android', 'goog_publicKey');
    await billing.offerings();
    const pending = billing.purchase('$rc_lifetime');
    await vi.waitFor(() =>
      expect(sdk.purchasePackage).toHaveBeenCalledTimes(1),
    );
    await expect(billing.restore()).rejects.toThrow('already in progress');
    finish!({ customerInfo: paid });
    await pending;
    await expect(billing.restore()).resolves.toEqual(paid);
  });
});
