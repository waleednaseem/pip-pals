import { AdBanner } from "@/components/AdBanner";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { TradingPair } from "@/types/calculator";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  selectedPair: TradingPair | null;
  unreadNotif: number;
  hasHistory: boolean;
  onNavigate: (tab: string) => void;
  onClearHistory: () => void;
  onExportCSV: () => void;
  onChangePair: () => void;
}

export const AppShell = ({
  children,
  activeTab,
  selectedPair,
  unreadNotif,
  hasHistory,
  onNavigate,
  onClearHistory,
  onExportCSV,
  onChangePair,
}: AppShellProps) => {
  return (
    <SidebarProvider>
      <AppSidebar
        activeTab={activeTab}
        hasPair={Boolean(selectedPair)}
        onNavigate={onNavigate}
      />
      <SidebarInset>
        <AppHeader
          activeTab={activeTab}
          selectedPair={selectedPair}
          unreadNotif={unreadNotif}
          hasHistory={hasHistory}
          onNavigate={onNavigate}
          onClearHistory={onClearHistory}
          onExportCSV={onExportCSV}
          onChangePair={onChangePair}
        />
        <div className="flex-1 space-y-4 p-3 md:p-5">
          <AdBanner />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
