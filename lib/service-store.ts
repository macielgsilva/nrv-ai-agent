import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { NRV_SERVICES, type NrvService, type ServiceCategory } from "./nrv-catalog";

const STORAGE_KEY = "nrv.services.v1";
const listeners = new Set<() => void>();
let services: NrvService[] = NRV_SERVICES;
let hydrationStarted = false;

export type ServiceDraft = Omit<NrvService, "id">;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return services;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalizeService(value: unknown): NrvService | null {
  if (!value || typeof value !== "object") return null;
  const service = value as Partial<NrvService>;
  const price = service.price;
  const validCategories: ServiceCategory[] = ["Hardware", "Software", "Manutenção"];

  if (
    typeof service.id !== "string" ||
    !validCategories.includes(service.category as ServiceCategory) ||
    typeof service.item !== "string" ||
    typeof service.serviceType !== "string" ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof service.duration !== "string" ||
    typeof service.notes !== "string"
  ) {
    return null;
  }

  return {
    id: service.id,
    category: service.category as ServiceCategory,
    item: service.item.trim(),
    serviceType: service.serviceType.trim(),
    price: Math.round(price * 100) / 100,
    duration: service.duration.trim(),
    notes: service.notes.trim(),
  };
}

async function persist(nextServices: NrvService[]) {
  services = nextServices;
  emitChange();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextServices));
}

async function hydrate() {
  if (hydrationStarted) return;
  hydrationStarted = true;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as unknown[];
    if (Array.isArray(parsed)) {
      const validServices = parsed.map(normalizeService).filter((item): item is NrvService => Boolean(item));
      if (validServices.length > 0) {
        services = validServices;
        emitChange();
      }
    }
  } catch {
    services = NRV_SERVICES;
    emitChange();
  }
}

function makeId(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "servico"}-${Date.now().toString(36)}`;
}

export async function createService(draft: ServiceDraft) {
  const service = normalizeService({ ...draft, id: makeId(draft.item) });
  if (!service) throw new Error("Dados do serviço inválidos.");
  await persist([...services, service]);
  return service;
}

export async function updateService(id: string, draft: ServiceDraft) {
  const service = normalizeService({ ...draft, id });
  if (!service) throw new Error("Dados do serviço inválidos.");
  await persist(services.map((current) => (current.id === id ? service : current)));
}

export async function deleteService(id: string) {
  await persist(services.filter((service) => service.id !== id));
}

export async function restoreDefaultServices() {
  await persist(NRV_SERVICES);
}

export function useServices() {
  const currentServices = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrate();
  }, []);

  return useMemo(
    () => ({
      services: currentServices,
      createService,
      updateService,
      deleteService,
      restoreDefaultServices,
    }),
    [currentServices],
  );
}
