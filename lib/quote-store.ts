import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { NrvService } from "./nrv-catalog";
import {
  calculateQuoteTotal,
  getQuoteItemCount,
  type QuoteItem,
} from "./quote-utils";

const STORAGE_KEY = "nrv.quote.v1";
const listeners = new Set<() => void>();
let quoteItems: QuoteItem[] = [];
let hydrationStarted = false;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return quoteItems;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function persist(nextItems: QuoteItem[]) {
  quoteItems = nextItems;
  emitChange();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

async function hydrate() {
  if (hydrationStarted) return;
  hydrationStarted = true;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as QuoteItem[];
    if (Array.isArray(parsed)) {
      quoteItems = parsed.filter(
        (item) => item?.service?.id && Number.isFinite(item.quantity) && item.quantity > 0,
      );
      emitChange();
    }
  } catch {
    quoteItems = [];
    emitChange();
  }
}

export async function addToQuote(service: NrvService) {
  const existing = quoteItems.find((item) => item.service.id === service.id);
  if (existing) {
    await persist(
      quoteItems.map((item) =>
        item.service.id === service.id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
    return;
  }

  await persist([...quoteItems, { service, quantity: 1 }]);
}

export async function setQuoteQuantity(serviceId: string, quantity: number) {
  if (quantity <= 0) {
    await persist(quoteItems.filter((item) => item.service.id !== serviceId));
    return;
  }

  await persist(
    quoteItems.map((item) =>
      item.service.id === serviceId ? { ...item, quantity } : item,
    ),
  );
}

export async function removeFromQuote(serviceId: string) {
  await persist(quoteItems.filter((item) => item.service.id !== serviceId));
}

export function useQuote() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrate();
  }, []);

  return useMemo(
    () => ({
      items,
      total: calculateQuoteTotal(items),
      itemCount: getQuoteItemCount(items),
      addToQuote,
      setQuoteQuantity,
      removeFromQuote,
    }),
    [items],
  );
}
