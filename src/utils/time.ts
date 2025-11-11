import { TimeUnit } from "@/types/calculator";

export interface DurationDetails {
  value: number;
  unit: TimeUnit;
  totalMinutes: number;
  months: number;
  days: number;
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
  if (unit === "Minutes_5") {
    return value * 5;
  }
  if (unit === "Minutes_30") {
    return value * 30;
  }
  if (unit === "Hours_4") {
    return value * 4 * 60;
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

export const formatDurationText = (
  months: number,
  days: number,
  hours: number,
  minutesText: string
): string => {
  const parts: string[] = [];

  if (months > 0) {
    const monthLabel = months === 1 ? "month" : "months";
    parts.push(`${months} ${monthLabel}`);
  }

  if (days > 0) {
    const dayLabel = days === 1 ? "day" : "days";
    parts.push(`${days} ${dayLabel}`);
  }

  if (hours > 0) {
    const hourLabel = hours === 1 ? "hour" : "hours";
    parts.push(`${hours} ${hourLabel}`);
  }

  const minutesNumeric = Number(minutesText);
  if (minutesNumeric > 0) {
    const minuteLabel = minutesNumeric === 1 ? "minute" : "minutes";
    parts.push(`${minutesText} ${minuteLabel}`);
  }

  return parts.length > 0 ? parts.join(", ") : "0 minutes";
};

export const buildDurationDetails = (value: number, unit: TimeUnit): DurationDetails => {
  const totalMinutes = convertToMinutes(value, unit);

  // Calculate months (assuming 30 days per month)
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;
  
  const months = Math.floor(totalDays / 30);
  const remainingDaysAfterMonths = totalDays - months * 30;
  
  const days = Math.floor(remainingDaysAfterMonths);
  const remainingHoursAfterDays = (remainingDaysAfterMonths - days) * 24;
  
  const hours = Math.floor(remainingHoursAfterDays);
  const remainingMinutesRaw = (remainingHoursAfterDays - hours) * 60;

  let roundedMinutes = Math.round(remainingMinutesRaw * 100) / 100;

  const minutesText = formatMinutesValue(roundedMinutes);
  const formatted = formatDurationText(months, days, hours, minutesText);

  return {
    value,
    unit,
    totalMinutes,
    months,
    days,
    hours,
    minutes: parseFloat(minutesText),
    formatted,
  };
};

