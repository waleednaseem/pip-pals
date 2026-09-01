import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Trash2, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MedicationEntry } from "@/types/mentalHealth";
import { getMedications, addMedication, updateMedication, deleteMedication } from "@/utils/mentalHealth";

const FREQUENCY_OPTIONS = ["Once daily", "Twice daily", "Thrice daily", "Weekly", "As needed"];

const formatDuration = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  if (days < 1) return "Started today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return remainingDays > 0
      ? `${months} month${months === 1 ? "" : "s"} ${remainingDays} day${remainingDays === 1 ? "" : "s"}`
      : `${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  return months > 0
    ? `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`
    : `${years} year${years === 1 ? "" : "s"}`;
};

export const MedicationTracker = () => {
  const { toast } = useToast();
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState(FREQUENCY_OPTIONS[0]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setMedications(getMedications());
  }, []);

  const handleAdd = () => {
    if (!name.trim() || !dosage.trim()) {
      toast({ title: "Missing info", description: "Name and dosage are required", variant: "destructive" });
      return;
    }

    const entry: MedicationEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      startDate,
      active: true,
      notes: notes.trim() || undefined,
    };

    addMedication(entry);
    setMedications(getMedications());
    setName("");
    setDosage("");
    setNotes("");
    setFrequency(FREQUENCY_OPTIONS[0]);
    setStartDate(new Date().toISOString().split("T")[0]);
    toast({ title: "Added", description: `${entry.name} added to tracking` });
  };

  const handleStop = (id: string) => {
    updateMedication(id, { active: false, endDate: new Date().toISOString().split("T")[0] });
    setMedications(getMedications());
    toast({ title: "Stopped", description: "Moved to past medications" });
  };

  const handleDelete = (id: string) => {
    deleteMedication(id);
    setMedications(getMedications());
    toast({ title: "Deleted", description: "Medication entry removed" });
  };

  const activeMeds = medications.filter((m) => m.active);
  const pastMeds = medications.filter((m) => !m.active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Add Medicine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Medicine name" />
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Dosage (e.g. 500mg)" />
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
          <Button onClick={handleAdd} className="w-full sm:w-auto">Add Medicine</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Medicines ({activeMeds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active medicines</p>
          ) : (
            <div className="space-y-2">
              {activeMeds.map((m) => (
                <div key={m.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{m.name} <span className="text-muted-foreground font-normal">· {m.dosage}</span></div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.frequency} · {formatDuration(m.startDate)}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:bg-amber-50" title="Stop" onClick={() => handleStop(m.id)}>
                        <StopCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" title="Delete" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pastMeds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Past Medications ({pastMeds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastMeds.map((m) => (
                <div key={m.id} className="rounded-md border p-3 flex items-start justify-between gap-2 opacity-70">
                  <div>
                    <div className="font-medium text-sm">{m.name} <span className="text-muted-foreground font-normal">· {m.dosage}</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">Stopped</Badge>
                      {m.startDate} → {m.endDate}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MedicationTracker;
