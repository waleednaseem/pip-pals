export interface CostEstimate {
  minUsd: number;
  maxUsd: number;
  label: string; // e.g. "$500 - $2,000"
}

export interface BusinessIdea {
  id: string;
  source: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  category: string; // e.g. "E-commerce", "SaaS", "Local Service"
  originCountry: string; // where the idea/post is from, or "Global"
  suitableCountries: string[]; // best-fit markets, or ["Global"]
  costEstimate: CostEstimate | null;
  language: string; // e.g. "English", "Roman Urdu", "French"
  aiTagged: boolean; // false until enrichment succeeds for this item
}

export interface IdeaFeedResult {
  items: BusinessIdea[];
  errors: string[]; // human readable source names that failed
  fetchedAt: number;
  stale: boolean;
}

export interface AiEnrichmentEntry {
  isBusinessIdea: boolean;
  originCountry: string;
  suitableCountries: string[];
  costEstimate: CostEstimate | null;
  category: string;
  language: string;
}

export const BUDGET_PRESETS = [1000, 10000, 50000, 100000, 500000] as const;
