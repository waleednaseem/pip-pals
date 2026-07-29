import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Globe2,
  DollarSign,
  Sparkles,
  KeyRound,
  MapPin,
  Languages,
} from "lucide-react";
import { BusinessIdea } from "@/types/businessIdeas";
import {
  fetchBusinessIdeas,
  enrichIdeasWithAI,
  filterByCountry,
  filterByBudget,
  filterByLanguage,
  getOpenAiKey,
  setOpenAiKey,
  COUNTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  IDEA_SOURCE_NAMES,
} from "@/utils/businessIdeas";
import { BUDGET_PRESETS } from "@/types/businessIdeas";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const timeAgo = (dateStr: string): string => {
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return "";
  const diffMin = Math.round((Date.now() - date) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
};

const formatBudget = (value: number): string =>
  value >= 1000 ? `$${(value / 1000).toLocaleString()}K` : `$${value}`;

export default function BusinessIdeas() {
  const { toast } = useToast();

  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [apiKey, setApiKeyState] = useState<string>("");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);

  const [countryFilter, setCountryFilter] = useState<string>("All");
  const [languageFilter, setLanguageFilter] = useState<string>("All");
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState<string>("");

  const loadIdeas = async (force = false) => {
    setLoading(true);
    const res = await fetchBusinessIdeas(force);
    setIdeas(res.items);
    setErrors(res.errors);
    setUpdatedAt(res.fetchedAt);
    setLoading(false);
  };

  useEffect(() => {
    setApiKeyState(getOpenAiKey());
    loadIdeas();
  }, []);

  const handleSaveKey = () => {
    setOpenAiKey(apiKeyInput);
    setApiKeyState(apiKeyInput.trim());
    setApiKeyInput("");
    toast({ title: "API key saved", description: "Stored locally in this browser only." });
  };

  const handleClearKey = () => {
    setOpenAiKey("");
    setApiKeyState("");
    toast({ title: "API key removed" });
  };

  const handleAnalyzeWithAI = async () => {
    if (!apiKey) return;
    setAiBusy(true);
    setAiProgress({ done: 0, total: ideas.length });
    const res = await enrichIdeasWithAI(ideas, apiKey, setAiProgress);
    setIdeas(res.items);
    if (res.errors.length > 0) {
      toast({
        title: "AI tagging finished with some errors",
        description: res.errors.slice(0, 2).join(" · "),
        variant: "destructive",
      });
    } else {
      toast({ title: "AI tagging complete", description: `${res.items.length} ideas tagged.` });
    }
    setAiBusy(false);
    setAiProgress(null);
  };

  const untaggedCount = useMemo(() => ideas.filter((i) => !i.aiTagged).length, [ideas]);

  const applyBudgetPreset = (value: number) => {
    setMaxBudget((prev) => (prev === value ? null : value));
    setCustomBudget("");
  };

  const applyCustomBudget = () => {
    const parsed = parseFloat(customBudget);
    if (!isNaN(parsed) && parsed > 0) setMaxBudget(parsed);
  };

  const filteredIdeas = useMemo(() => {
    let result = filterByCountry(ideas, countryFilter);
    result = filterByLanguage(result, languageFilter);
    result = filterByBudget(result, maxBudget);
    return result;
  }, [ideas, countryFilter, languageFilter, maxBudget]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Business Ideas
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => loadIdeas(true)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Free business &amp; startup idea feeds from {IDEA_SOURCE_NAMES.join(", ")} — tagged with AI for origin
          country, best-fit market, and rough startup cost.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API key setup */}
        <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4" />
            OpenAI API Key
            {apiKey && <Badge variant="secondary" className="text-[10px]">Saved</Badge>}
          </div>
          {apiKey ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Key is stored in this browser only. AI tagging enriches {untaggedCount} untagged idea(s).
              </span>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleAnalyzeWithAI}
                  disabled={aiBusy || untaggedCount === 0}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiBusy
                    ? aiProgress
                      ? `Tagging ${aiProgress.done}/${aiProgress.total}...`
                      : "Tagging..."
                    : untaggedCount === 0
                    ? "All tagged"
                    : `Analyze ${untaggedCount} with AI`}
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={handleClearKey}>
                  Remove key
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="h-9"
              />
              <Button size="sm" className="h-9" onClick={handleSaveKey} disabled={!apiKeyInput.trim()}>
                Save Key
              </Button>
            </div>
          )}
          {!apiKey && (
            <p className="text-xs text-muted-foreground">
              Without a key, ideas show with country/cost as "Unknown" — add a key to auto-tag them.
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Countries</SelectItem>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Languages</SelectItem>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            {BUDGET_PRESETS.map((preset) => (
              <Badge
                key={preset}
                variant="outline"
                className={cn(
                  "cursor-pointer select-none transition-colors",
                  maxBudget === preset
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground"
                )}
                onClick={() => applyBudgetPreset(preset)}
              >
                Under {formatBudget(preset)}
              </Badge>
            ))}
            <Input
              type="number"
              placeholder="Custom max $"
              value={customBudget}
              onChange={(e) => setCustomBudget(e.target.value)}
              onBlur={applyCustomBudget}
              onKeyDown={(e) => e.key === "Enter" && applyCustomBudget()}
              className="h-8 w-32 text-xs"
            />
            {maxBudget != null && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setMaxBudget(null);
                  setCustomBudget("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Couldn't refresh: {errors.join(", ")}</span>
          </div>
        )}

        {updatedAt && (
          <div className="text-xs text-muted-foreground">
            Updated {timeAgo(new Date(updatedAt).toISOString())} · {filteredIdeas.length} of {ideas.length} ideas
          </div>
        )}

        {loading && ideas.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Loading business ideas…</div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No ideas match the selected filters. Try widening the country or budget filter.
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredIdeas.map((idea) => (
              <a
                key={idea.id}
                href={idea.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{idea.source}</Badge>
                    <Badge variant="outline" className="text-[10px]">{idea.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">{idea.language}</Badge>
                    {!idea.aiTagged && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Not tagged yet
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(idea.pubDate)}</span>
                </div>

                <div className="text-sm font-medium flex items-start gap-1.5">
                  <span className="flex-1">{idea.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>

                {idea.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>
                )}

                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    From: {idea.originCountry}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Globe2 className="h-3 w-3" />
                    Best for: {idea.suitableCountries.join(", ")}
                  </span>
                  {idea.costEstimate && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <DollarSign className="h-2.5 w-2.5" />
                      {idea.costEstimate.label}
                    </Badge>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
