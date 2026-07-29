export interface DreamEntry {
  id: string;
  timestamp: number;
  date: string;
  content: string;
  mood?: DreamMood;
}

export type DreamMood = "happy" | "neutral" | "scary" | "confusing" | "sad";

export interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  notes?: string;
}

export interface WeeklySleepEntry {
  id: string;
  timestamp: number;
  weekStartDate: string;
  weekLabel: string;
  totalHours: number;
  poorNights: number;
  notes?: string;
}

export interface GymLogEntry {
  id: string;
  timestamp: number;
  date: string;
  didWorkout: boolean;
  activityType?: string;
  notes?: string;
}
