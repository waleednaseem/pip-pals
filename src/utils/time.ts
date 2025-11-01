import { TimeUnit } from "@/types/calculator";

export interface DurationDetails {
  value: number;
  unit: TimeUnit;
  totalMinutes: number;
  hours: number;
  minutes: number;
  formatted: string;
}

export const convertToMinutes = (value: number, unit: TimeUnit): number => {
  if (unit === "Hours") {
    return value * 60;
  }
  if (unit === "Days") {
    return value * 24 * 60;
  }
  return value;
};

export const formatMinutesValue = (minutes: number): string => {
  const normalized = Math.round(minutes * 100) / 100;

  if (Number.isInteger(normalized)) {
    return normalized.toString();
  }

  return normalized
    .toFixed(2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
};

export const formatDurationText = (hours: number, minutesText: string): string => {
  const hourLabel = hours === 1 ? "hour" : "hours";
  const minutesNumeric = Number(minutesText);
  const minuteLabel = minutesNumeric === 1 ? "minute" : "minutes";

  return `${hours} ${hourLabel} ${minutesText} ${minuteLabel}`;
};

export const buildDurationDetails = (value: number, unit: TimeUnit): DurationDetails => {
  const totalMinutes = convertToMinutes(value, unit);

  const baseHours = Math.floor(totalMinutes / 60);
  const remainingMinutesRaw = totalMinutes - baseHours * 60;

  let roundedMinutes = Math.round(remainingMinutesRaw * 100) / 100;
  let hours = baseHours;

  if (roundedMinutes >= 60) {
    const extraHours = Math.floor(roundedMinutes / 60);
    hours += extraHours;
    roundedMinutes = Math.round((roundedMinutes - extraHours * 60) * 100) / 100;
  }

  const minutesText = formatMinutesValue(roundedMinutes);
  const formatted = formatDurationText(hours, minutesText);

  return {
    value,
    unit,
    totalMinutes,
    hours,
    minutes: parseFloat(minutesText),
    formatted,
  };
};

