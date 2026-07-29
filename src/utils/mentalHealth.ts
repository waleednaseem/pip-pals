import { DreamEntry, MedicationEntry, WeeklySleepEntry, GymLogEntry } from "@/types/mentalHealth";

const KEYS = {
  DREAMS: "mental-health-dreams",
  MEDICATIONS: "mental-health-medications",
  SLEEP: "mental-health-sleep-weekly",
  GYM: "mental-health-gym",
} as const;

function readArray<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function writeArray<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

// ---------- Dreams ----------

export const getDreams = (): DreamEntry[] =>
  readArray<DreamEntry>(KEYS.DREAMS).sort((a, b) => b.timestamp - a.timestamp);

export const addDream = (entry: DreamEntry): void => {
  const dreams = readArray<DreamEntry>(KEYS.DREAMS);
  dreams.push(entry);
  writeArray(KEYS.DREAMS, dreams);
};

export const deleteDream = (id: string): void => {
  const dreams = readArray<DreamEntry>(KEYS.DREAMS).filter((d) => d.id !== id);
  writeArray(KEYS.DREAMS, dreams);
};

// ---------- Medications ----------

export const getMedications = (): MedicationEntry[] =>
  readArray<MedicationEntry>(KEYS.MEDICATIONS).sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

export const addMedication = (entry: MedicationEntry): void => {
  const meds = readArray<MedicationEntry>(KEYS.MEDICATIONS);
  meds.push(entry);
  writeArray(KEYS.MEDICATIONS, meds);
};

export const updateMedication = (id: string, updates: Partial<MedicationEntry>): void => {
  const meds = readArray<MedicationEntry>(KEYS.MEDICATIONS).map((m) =>
    m.id === id ? { ...m, ...updates } : m
  );
  writeArray(KEYS.MEDICATIONS, meds);
};

export const deleteMedication = (id: string): void => {
  const meds = readArray<MedicationEntry>(KEYS.MEDICATIONS).filter((m) => m.id !== id);
  writeArray(KEYS.MEDICATIONS, meds);
};

// ---------- Weekly Sleep ----------

export const getWeeklySleep = (): WeeklySleepEntry[] =>
  readArray<WeeklySleepEntry>(KEYS.SLEEP).sort((a, b) => b.timestamp - a.timestamp);

export const addWeeklySleep = (entry: WeeklySleepEntry): void => {
  const entries = readArray<WeeklySleepEntry>(KEYS.SLEEP);
  entries.push(entry);
  writeArray(KEYS.SLEEP, entries);
};

export const deleteWeeklySleep = (id: string): void => {
  const entries = readArray<WeeklySleepEntry>(KEYS.SLEEP).filter((e) => e.id !== id);
  writeArray(KEYS.SLEEP, entries);
};

// ---------- Gym ----------

export const getGymLogs = (): GymLogEntry[] =>
  readArray<GymLogEntry>(KEYS.GYM).sort((a, b) => b.timestamp - a.timestamp);

export const addGymLog = (entry: GymLogEntry): void => {
  const logs = readArray<GymLogEntry>(KEYS.GYM);
  logs.push(entry);
  writeArray(KEYS.GYM, logs);
};

export const deleteGymLog = (id: string): void => {
  const logs = readArray<GymLogEntry>(KEYS.GYM).filter((g) => g.id !== id);
  writeArray(KEYS.GYM, logs);
};
