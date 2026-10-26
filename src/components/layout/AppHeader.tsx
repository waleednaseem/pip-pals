import { Bell } from "lucide-react";
import ActionButtons from "@/components/ActionButtons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getTabLabel } from "@/config/nav";
import type { TradingPair } from "@/types/calculator";

interface AppHeaderProps {
  activeTab: string;
  selectedPair: TradingPair | null;
  unreadNotif: number;
  hasHistory: boolean;
  onNavigate: (tab: string) => void;
  onClearHistory: () => void;
  onExportCSV: () => void;
  onChangePair: () => void;
}

export const AppHeader = ({
  activeTab,
  selectedPair,
  unreadNotif,
  hasHistory,
  onNavigate,
  onClearHistory,
  onExportCSV,
  onChangePair,
}: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold leading-tight">{getTabLabel(activeTab)}</h1>
        <p className="truncate text-[11px] text-muted-foreground">
          {activeTab === "studio"
            ? "PDF, image, text, ZIP, and converters"
            : selectedPair
              ? `Trading · ${selectedPair}`
              : "Your all-in-one financial dashboard"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate("notifications")}
          className="relative rounded-lg border border-border bg-card p-2 hover:border-primary/40 hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadNotif > 0 && (
            <span className="badge-soft-pulse absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadNotif}
            </span>
          )}
        </button>
        <ThemeToggle compact />
        {selectedPair && (
          <ActionButtons
            onClearHistory={onClearHistory}
            onExportCSV={onExportCSV}
            onChangePair={onChangePair}
            hasHistory={hasHistory}
          />
        )}
      </div>
    </header>
  );
};
