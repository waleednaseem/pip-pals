export type CalendarImpact = "High" | "Medium" | "Low" | "Holiday";

export interface CalendarEvent {
  id: string;
  title: string;
  country: string; // currency code e.g. USD, EUR, JPY
  date: string; // ISO date string
  impact: CalendarImpact;
  forecast: string;
  previous: string;
}

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  pubDate: string; // ISO or parseable date string
  description: string;
}

export interface FeedFetchResult<T> {
  items: T[];
  errors: string[]; // human readable source names that failed
  fetchedAt: number;
  stale: boolean;
}
