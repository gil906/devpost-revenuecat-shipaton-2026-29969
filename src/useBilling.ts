import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  Purchases,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import {
  Billing,
  billingError,
  hasPremium,
  OfferingUnavailableError,
  type EntitlementInfo,
} from './billing';

const billing = new Billing(
  Purchases,
  Capacitor.getPlatform(),
  import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY?.trim() ?? '',
);

export function useBilling() {
  const [info, setInfo] = useState<EntitlementInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const premium = info !== null && hasPremium(info, clock);

  const refresh = useCallback(async () => {
    if (billing.availability) return;
    try {
      setInfo(await billing.customer());
      setClock(Date.now());
    } catch (error) {
      setInfo(null);
      setMessage(billingError(error));
    }
  }, []);

  useEffect(() => {
    if (billing.availability) return;
    let disposed = false;
    let removeCustomer: (() => Promise<void>) | undefined;
    let removeApp: (() => Promise<void>) | undefined;
    const update = (value: EntitlementInfo) => {
      if (!disposed) {
        setInfo(value);
        setClock(Date.now());
      }
    };
    void billing
      .listen(update)
      .then((remove) => {
        if (disposed) return remove();
        removeCustomer = remove;
      })
      .catch((error: unknown) => setMessage(billingError(error)));
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void refresh();
    })
      .then((handle) => {
        if (disposed) return handle.remove();
        removeApp = () => handle.remove();
      })
      .catch(() =>
        setMessage(
          'Could not observe app resume. Use Refresh access after returning from the store.',
        ),
      );
    void refresh();
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      void removeCustomer?.().catch(() =>
        console.error('Purchase listener cleanup failed.'),
      );
      void removeApp?.().catch(() =>
        console.error('App listener cleanup failed.'),
      );
    };
  }, [refresh]);

  async function loadOfferings() {
    if (billing.availability || busy) return;
    setBusy(true);
    setMessage('');
    setPackages([]);
    try {
      setPackages(await billing.offerings());
    } catch (error) {
      setMessage(
        error instanceof OfferingUnavailableError
          ? error.message
          : billingError(error),
      );
    } finally {
      setBusy(false);
    }
  }

  async function transact(identifier?: string) {
    if (busy || billing.availability) return;
    setBusy(true);
    setMessage('');
    try {
      const customer = identifier
        ? await billing.purchase(identifier)
        : await billing.restore();
      setInfo(customer);
      setClock(Date.now());
      setMessage(
        hasPremium(customer)
          ? 'Steady Plus is active. Your stretch scenarios are unlocked.'
          : 'No active Plus access was returned by the store. If payment is pending, refresh access after approval.',
      );
    } catch (error) {
      setMessage(billingError(error));
    } finally {
      setBusy(false);
    }
  }

  return {
    premium,
    packages,
    message,
    busy,
    availability: billing.availability,
    loadOfferings,
    transact,
    refresh,
  };
}
