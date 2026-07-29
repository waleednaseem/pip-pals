import { useEffect, useState } from "react";
import { Ad } from "@/types/ads";
import { ADS_UPDATED_EVENT, extractYoutubeId, getActiveAds } from "@/utils/ads";

const ROTATE_INTERVAL_MS = 10000;

const pickNext = (ads: Ad[], currentId: string | null): Ad => {
  if (ads.length === 1) return ads[0];
  const candidates = ads.filter((a) => a.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)] || ads[0];
};

export const AdBanner = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [current, setCurrent] = useState<Ad | null>(null);

  useEffect(() => {
    const load = () => {
      const active = getActiveAds();
      setAds(active);
      setCurrent((prev) => {
        if (active.length === 0) return null;
        if (prev && active.some((a) => a.id === prev.id)) return prev;
        return pickNext(active, null);
      });
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    window.addEventListener(ADS_UPDATED_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
      window.removeEventListener(ADS_UPDATED_EVENT, load);
    };
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => pickNext(ads, prev?.id || null));
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ads]);

  if (!current) return null;

  const content = () => {
    if (current.type === "youtube") {
      const videoId = extractYoutubeId(current.youtubeUrl || "");
      if (!videoId) return null;
      return (
        <iframe
          className="h-full w-full rounded"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`}
          title={current.title}
          allow="autoplay; encrypted-media"
          frameBorder={0}
        />
      );
    }
    if (current.mediaKind === "video") {
      return (
        <video
          key={current.id}
          src={current.mediaData}
          className="h-full w-full object-cover rounded"
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }
    if (current.mediaData) {
      return (
        <img
          key={current.id}
          src={current.mediaData}
          className="h-full w-full object-cover rounded"
          alt={current.title}
        />
      );
    }
    return null;
  };

  const isPromotion = current.type === "promotion" || current.type === "youtube";

  const inner = (
    <div
      className={`relative flex items-center gap-3 rounded-xl overflow-hidden ${isPromotion ? "h-28 md:h-36" : "h-14 md:h-16"}`}
      style={{background: "hsl(220 40% 9%)", border: "1px solid hsl(220 32% 18%)"}}
    >
      <div className="absolute top-1.5 left-1.5 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style={{background: "hsl(199 100% 50% / 0.15)", color: "hsl(199 100% 55%)", border: "1px solid hsl(199 100% 50% / 0.25)"}}>
        Ad
      </div>
      <div className={`h-full ${isPromotion ? "w-full" : "w-20 md:w-28 shrink-0"}`}>
        {content()}
      </div>
      {!isPromotion && (
        <div className="min-w-0 flex-1 pr-3">
          <div className="font-semibold text-sm truncate text-[hsl(210_40%_90%)]">{current.title}</div>
          <div className="text-xs text-[hsl(215_20%_45%)]">Sponsored</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="sticky top-0 z-40 -mx-3 md:-mx-5 px-3 md:px-5 py-2 mb-2"
      style={{background: "hsl(222 47% 5% / 0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(220 32% 14%)"}}>
      <div className="max-w-7xl mx-auto">
        {current.linkUrl ? (
          <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
    </div>
  );
};
