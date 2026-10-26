import { logToolRun, syncFavorite, syncRecent } from "@/lib/client/persist";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

function parseToolId(id: string): { family: string; slug: string } {
  const [family, ...rest] = id.split(":");
  return { family: family || "unknown", slug: rest.join(":") || id };
}

const FAVORITES_KEY = "pip-pals:studio:favorites";
const RECENT_KEY = "pip-pals:studio:recent";
const MAX_RECENT = 12;

type FavoritesContextValue = {
  favorites: string[];
  recent: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addRecent: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined
);

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const localFav = readList(FAVORITES_KEY);
    const localRecent = readList(RECENT_KEY);
    setFavorites(localFav);
    setRecent(localRecent);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }, [recent, hydrated]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const removing = prev.includes(id);
      syncFavorite(id, removing ? "remove" : "add");
      return removing ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const addRecent = useCallback((id: string) => {
    const { family, slug } = parseToolId(id);
    logToolRun({ family, slug, source: "recent" });
    syncRecent(id);
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)];
      return next.slice(0, MAX_RECENT);
    });
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      recent,
      toggleFavorite,
      isFavorite,
      addRecent,
    }),
    [favorites, recent, toggleFavorite, isFavorite, addRecent]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
