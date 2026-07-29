export type AdType = "banner" | "promotion" | "youtube";
export type AdMediaKind = "image" | "video";

export interface Ad {
  id: string;
  type: AdType;
  title: string;
  mediaKind?: AdMediaKind; // relevant for "banner" and "promotion" types
  mediaData?: string; // base64 data URL of uploaded image/video
  youtubeUrl?: string; // relevant for "youtube" type
  linkUrl?: string; // optional click-through URL
  active: boolean;
  createdAt: string;
}

export interface AdsData {
  ads: Ad[];
}

export const AD_TYPE_META: Record<AdType, { label: string; description: string }> = {
  banner: { label: "Banner", description: "Slim strip ad (image or short video)" },
  promotion: { label: "Promotion", description: "Larger showcase ad (image or video)" },
  youtube: { label: "YouTube Preview", description: "Embedded YouTube video preview" },
};
