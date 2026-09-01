import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DreamEntry, DreamMood } from "@/types/mentalHealth";
import { getDreams, addDream, deleteDream } from "@/utils/mentalHealth";

const MOOD_OPTIONS: { value: DreamMood; label: string; className: string }[] = [
  { value: "happy", label: "😊 Happy", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  { value: "neutral", label: "😐 Neutral", className: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  { value: "scary", label: "😨 Scary", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  { value: "confusing", label: "🤔 Confusing", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "sad", label: "😢 Sad", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
];

export const DreamJournal = () => {
  const { toast } = useToast();
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<DreamMood | "">("");

  useEffect(() => {
    setDreams(getDreams());
  }, []);

  const handleSave = () => {
    if (!content.trim()) {
      toast({ title: "Dream required", description: "Please write the dream details", variant: "destructive" });
      return;
    }

    const now = new Date();
    const entry: DreamEntry = {
      id: crypto.randomUUID(),
      timestamp: now.getTime(),
      date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      content: content.trim(),
      mood: mood || undefined,
    };

    addDream(entry);
    setDreams(getDreams());
    setContent("");
    setMood("");
    toast({ title: "Saved", description: "Dream saved to history" });
  };

  const handleDelete = (id: string) => {
    deleteDream(id);
    setDreams(getDreams());
    toast({ title: "Deleted", description: "Dream entry removed" });
  };

  const moodInfo = (m?: DreamMood) => MOOD_OPTIONS.find((o) => o.value === m);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Today's Dream
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your dream here..."
            className="min-h-[100px]"
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <Select value={mood} onValueChange={(v) => setMood(v as DreamMood)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Mood (optional)" />
              </SelectTrigger>
              <SelectContent>
                {MOOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} className="sm:ml-auto">Save Dream</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dream History ({dreams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {dreams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No dreams saved yet</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {dreams.map((d) => {
                const info = moodInfo(d.mood);
                return (
                  <div key={d.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{d.date}</span>
                        {info && (
                          <Badge variant="outline" className={info.className}>{info.label}</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{d.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DreamJournal;
