import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GymLogEntry } from "@/types/mentalHealth";
import { getGymLogs, addGymLog, deleteGymLog } from "@/utils/mentalHealth";

const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const GymTracker = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<GymLogEntry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [didWorkout, setDidWorkout] = useState(true);
  const [activityType, setActivityType] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setLogs(getGymLogs());
  }, []);

  const handleSave = () => {
    const entry: GymLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(date).getTime(),
      date,
      didWorkout,
      activityType: activityType.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    addGymLog(entry);
    setLogs(getGymLogs());
    setActivityType("");
    setNotes("");
    setDidWorkout(true);
    toast({ title: "Logged", description: `${date} ka entry save ho gaya` });
  };

  const handleDelete = (id: string) => {
    deleteGymLog(id);
    setLogs(getGymLogs());
    toast({ title: "Deleted", description: "Gym log entry remove ho gayi" });
  };

  const weekSummary = useMemo(() => {
    const monday = getMondayOf(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const inWeek = logs.filter((l) => {
      const d = new Date(l.date);
      return d >= monday && d <= sunday;
    });
    const workoutDays = inWeek.filter((l) => l.didWorkout).length;
    return { workoutDays, totalLogged: inWeek.length };
  }, [logs]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Aaj ka Workout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex items-center gap-2">
              <Switch id="did-workout" checked={didWorkout} onCheckedChange={setDidWorkout} />
              <Label htmlFor="did-workout">{didWorkout ? "Gym/workout kiya" : "Nahi kiya"}</Label>
            </div>
          </div>
          {didWorkout && (
            <Input value={activityType} onChange={(e) => setActivityType(e.target.value)} placeholder="Activity type (e.g. Gym, Cardio, Yoga, Walk)" />
          )}
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
          <Button onClick={handleSave} className="w-full sm:w-auto">Save Log</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-base px-3 py-1 bg-primary/10 border-primary/30">
              {weekSummary.workoutDays} / 7 din workout
            </Badge>
            <span className="text-sm text-muted-foreground">{weekSummary.totalLogged} din log kiye is hafte</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Abhi tak koi entry save nahi hui</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="rounded-md border p-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {l.date}
                      {l.didWorkout ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Done</Badge>
                      ) : (
                        <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30" variant="outline">Skipped</Badge>
                      )}
                      {l.activityType && <span className="text-xs text-muted-foreground">· {l.activityType}</span>}
                    </div>
                    {l.notes && <p className="text-xs text-muted-foreground mt-1">{l.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-50" onClick={() => handleDelete(l.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GymTracker;
