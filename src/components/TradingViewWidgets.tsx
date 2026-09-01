import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface BaseProps {
  symbol: string;
  height?: number | string;
}

const injectWidgetScript = (
  container: HTMLDivElement,
  src: string,
  config: Record<string, unknown>
) => {
  container.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = src;
  script.async = true;
  script.text = JSON.stringify(config);
  container.appendChild(script);
};

const useChartTheme = () => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "light" ? "light" : "dark";
};

export const TradingViewChart = ({ symbol, height = 600 }: BaseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useChartTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    injectWidgetScript(
      containerRef.current,
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
      {
        autosize: true,
        symbol,
        interval: "60",
        timezone: "Etc/UTC",
        theme,
        style: "1",
        locale: "en",
        allow_symbol_change: false,
        calendar: false,
        support_host: "https://www.tradingview.com",
      }
    );
  }, [symbol, theme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height, minHeight: height, width: "100%" }}
    />
  );
};

export const TradingViewTechnicalAnalysis = ({ symbol, height = 500 }: BaseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useChartTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    injectWidgetScript(
      containerRef.current,
      "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js",
      {
        interval: "1h",
        width: "100%",
        isTransparent: true,
        height: "100%",
        symbol,
        showIntervalTabs: true,
        displayMode: "single",
        locale: "en",
        colorTheme: theme,
      }
    );
  }, [symbol, theme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height, minHeight: height, width: "100%" }}
    />
  );
};
