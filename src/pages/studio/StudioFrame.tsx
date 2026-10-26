import Footer from "@/components/file-studio/Footer";
import Header from "@/components/file-studio/Header";
import { AppShell } from "@/components/layout/AppShell";
import { getNotifications } from "@/utils/family";
import {
  clearSelectedPair,
  clearTradesFromStorage,
  exportTradesToCSV,
  getSelectedPair,
  getTradesFromStorage,
} from "@/utils/storage";
import type { TradingPair } from "@/types/calculator";
import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";

export function StudioFrame({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(() => getSelectedPair());
  const [hasHistory, setHasHistory] = useState(() => getTradesFromStorage().length > 0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => {
    setUnreadNotif(getNotifications().filter((n) => n.status === "unread").length);
  }, []);

  return (
    <AppShell
      activeTab="studio"
      selectedPair={selectedPair}
      unreadNotif={unreadNotif}
      hasHistory={hasHistory}
      onNavigate={(tab) => {
        if (tab === "studio") {
          navigate("/studio");
          return;
        }
        navigate(`/?tab=${encodeURIComponent(tab)}`);
      }}
      onClearHistory={() => {
        clearTradesFromStorage();
        setHasHistory(false);
      }}
      onExportCSV={() => exportTradesToCSV(getTradesFromStorage())}
      onChangePair={() => {
        clearSelectedPair();
        clearTradesFromStorage();
        setSelectedPair(null);
        setHasHistory(false);
        navigate("/?tab=pair");
      }}
    >
      <div className="studio rounded-2xl border border-border shadow-sm">
        <Header />
        {children ?? <Outlet />}
        <Footer />
      </div>
    </AppShell>
  );
}
