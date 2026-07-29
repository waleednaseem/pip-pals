import { Ad, AdsData, AdType } from "@/types/ads";

const STORAGE_KEY = "ads-data-v1";
export const ADS_UPDATED_EVENT = "ads-data-updated";

// localStorage writes only fire the native "storage" event in OTHER tabs/windows,
// not in the tab that made the change. Dispatch a custom event so components like
// AdBanner (mounted once at app root) refresh immediately within the same tab.
const notifyAdsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADS_UPDATED_EVENT));
  }
};

// Keep uploaded media small enough to safely fit in localStorage (shared with other app data).
export const MAX_MEDIA_FILE_BYTES = 1.5 * 1024 * 1024; // 1.5MB raw file

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const emptyData: AdsData = { ads: [] };

const normalizeAd = (a: Partial<Ad>): Ad | null => {
  if (!a || typeof a.id !== "string") return null;
  const type: AdType = a.type === "banner" || a.type === "promotion" || a.type === "youtube" ? a.type : "banner";
  return {
    id: a.id,
    type,
    title: typeof a.title === "string" && a.title.trim() ? a.title : "Untitled Ad",
    mediaKind: a.mediaKind === "image" || a.mediaKind === "video" ? a.mediaKind : undefined,
    mediaData: typeof a.mediaData === "string" ? a.mediaData : undefined,
    youtubeUrl: typeof a.youtubeUrl === "string" ? a.youtubeUrl : undefined,
    linkUrl: typeof a.linkUrl === "string" ? a.linkUrl : undefined,
    active: a.active !== false,
    createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date().toISOString(),
  };
};

export const getAdsData = (): AdsData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyData };
    const parsed = JSON.parse(raw) as Partial<AdsData>;
    const ads = Array.isArray(parsed.ads)
      ? parsed.ads.map(normalizeAd).filter((a): a is Ad => !!a)
      : [];
    return { ads };
  } catch {
    return { ...emptyData };
  }
};

export const saveAdsData = (data: AdsData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyAdsUpdated();
};

export const addAd = (ad: Omit<Ad, "id" | "createdAt">): Ad => {
  const newAd: Ad = { ...ad, id: uid(), createdAt: new Date().toISOString() };
  const data = getAdsData();
  data.ads = [newAd, ...data.ads];
  saveAdsData(data);
  return newAd;
};

export const deleteAd = (id: string) => {
  const data = getAdsData();
  data.ads = data.ads.filter((a) => a.id !== id);
  saveAdsData(data);
};

export const toggleAdActive = (id: string) => {
  const data = getAdsData();
  data.ads = data.ads.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
  saveAdsData(data);
};

export const getActiveAds = (): Ad[] => getAdsData().ads.filter((a) => a.active);

export const extractYoutubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
