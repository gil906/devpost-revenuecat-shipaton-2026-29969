import type {
  PurchasesPackage,
  PurchasesPlugin,
} from '@revenuecat/purchases-capacitor';

export const ENTITLEMENT = 'steady_plus';
export const PLUS_PRODUCT = 'steady_plus_lifetime';

export class OfferingUnavailableError extends Error {}

export interface EntitlementInfo {
  entitlements: {
    active: Record<
      string,
      { isActive: boolean; expirationDate: string | null }
    >;
  };
}

export interface BillingGateway {
  configure: PurchasesPlugin['configure'];
  getOfferings(): Promise<{
    current: { availablePackages: PurchasesPackage[] } | null;
  }>;
  getCustomerInfo(): Promise<{ customerInfo: EntitlementInfo }>;
  purchasePackage(options: {
    aPackage: PurchasesPackage;
  }): Promise<{ customerInfo: EntitlementInfo }>;
  restorePurchases(): Promise<{ customerInfo: EntitlementInfo }>;
  addCustomerInfoUpdateListener(
    listener: (info: EntitlementInfo) => void,
  ): Promise<string>;
  removeCustomerInfoUpdateListener: PurchasesPlugin['removeCustomerInfoUpdateListener'];
}

export function hasPremium(info: EntitlementInfo, now = Date.now()): boolean {
  const entitlement = info.entitlements.active[ENTITLEMENT];
  return (
    !!entitlement?.isActive &&
    (entitlement.expirationDate === null ||
      Date.parse(entitlement.expirationDate) > now)
  );
}

export function billingError(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('userCancelled' in error && error.userCancelled === true)
      return 'Purchase cancelled. You have not been given new access.';
    if ('code' in error && String(error.code) === '20')
      return 'Payment is pending approval. Plus unlocks after the store confirms it.';
  }
  return 'The store could not complete this request. Check your connection and try again. If you were charged, use Restore purchases.';
}

export class Billing {
  private initialization: Promise<void> | null = null;
  private packages: PurchasesPackage[] = [];
  private busy = false;

  constructor(
    private gateway: BillingGateway,
    private platform: string,
    private key: string,
  ) {}

  get availability(): string | null {
    if (this.platform !== 'android')
      return 'Browser preview: the three foundation scenarios are free. Purchases and Plus access are available only in the configured Android app.';
    if (!/^(goog|test)_[a-zA-Z0-9]+$/.test(this.key))
      return 'Purchases are not configured in this Android build. Free practice is available.';
    return null;
  }

  private async initialize(): Promise<void> {
    if (this.availability) throw new Error(this.availability);
    if (!this.initialization) {
      this.initialization = this.gateway
        .configure({ apiKey: this.key })
        .catch((error: unknown) => {
          this.initialization = null;
          throw error;
        });
    }
    await this.initialization;
  }

  async customer(): Promise<EntitlementInfo> {
    await this.initialize();
    return (await this.gateway.getCustomerInfo()).customerInfo;
  }

  async offerings(): Promise<PurchasesPackage[]> {
    await this.initialize();
    this.packages = [];
    const offerings = await this.gateway.getOfferings();
    // Steady sells a fixed practice library, not an auto-renewing subscription.
    this.packages =
      offerings.current?.availablePackages.filter(
        (item) =>
          item.packageType === 'LIFETIME' &&
          item.product.identifier === PLUS_PRODUCT &&
          item.product.productCategory === 'NON_SUBSCRIPTION' &&
          item.product.subscriptionPeriod === null,
      ) ?? [];
    if (!this.packages.length)
      throw new OfferingUnavailableError(
        'The one-time Plus purchase is unavailable. Free practice still works; try again later.',
      );
    return this.packages;
  }

  async purchase(identifier: string): Promise<EntitlementInfo> {
    await this.initialize();
    const aPackage = this.packages.find(
      (item) => item.identifier === identifier,
    );
    if (!aPackage)
      throw new Error('Select a currently available store package.');
    if (this.busy) throw new Error('A store request is already in progress.');
    this.busy = true;
    try {
      return (await this.gateway.purchasePackage({ aPackage })).customerInfo;
    } finally {
      this.busy = false;
    }
  }

  async restore(): Promise<EntitlementInfo> {
    await this.initialize();
    if (this.busy) throw new Error('A store request is already in progress.');
    this.busy = true;
    try {
      return (await this.gateway.restorePurchases()).customerInfo;
    } finally {
      this.busy = false;
    }
  }

  async listen(
    listener: (info: EntitlementInfo) => void,
  ): Promise<() => Promise<void>> {
    await this.initialize();
    const id = await this.gateway.addCustomerInfoUpdateListener(listener);
    return async () => {
      await this.gateway.removeCustomerInfoUpdateListener({
        listenerToRemove: id,
      });
    };
  }
}
