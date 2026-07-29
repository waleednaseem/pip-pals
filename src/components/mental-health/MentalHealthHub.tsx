import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, Pill, BedDouble, Dumbbell } from "lucide-react";
import { DreamJournal } from "./DreamJournal";
import { MedicationTracker } from "./MedicationTracker";
import { WeeklySleepTracker } from "./WeeklySleepTracker";
import { GymTracker } from "./GymTracker";

export const MentalHealthHub = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{background: "linear-gradient(135deg, hsl(270 80% 65% / 0.15) 0%, hsl(199 100% 50% / 0.15) 100%)", border: "1px solid hsl(270 80% 65% / 0.25)"}}>
          <BedDouble className="h-4 w-4 text-[hsl(270_80%_72%)]" />
        </div>
        <div>
          <h2 className="text-base font-semibold gradient-text-purple">Mental Health</h2>
          <p className="text-xs text-[hsl(215_20%_45%)]">Dreams, medications, sleep & gym tracker</p>
        </div>
      </div>

      <Tabs defaultValue="dreams" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 rounded-xl"
          style={{background: "hsl(220 40% 9%)", border: "1px solid hsl(220 32% 16%)"}}>
          <TabsTrigger value="dreams" className="flex-1 min-w-[100px] gap-1.5 text-xs rounded-lg data-[state=active]:bg-[hsl(199_100%_50%/0.12)] data-[state=active]:text-[hsl(199_100%_55%)]">
            <Moon className="h-3.5 w-3.5" />
            Dreams
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex-1 min-w-[100px] gap-1.5 text-xs rounded-lg data-[state=active]:bg-[hsl(199_100%_50%/0.12)] data-[state=active]:text-[hsl(199_100%_55%)]">
            <Pill className="h-3.5 w-3.5" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="sleep" className="flex-1 min-w-[100px] gap-1.5 text-xs rounded-lg data-[state=active]:bg-[hsl(199_100%_50%/0.12)] data-[state=active]:text-[hsl(199_100%_55%)]">
            <BedDouble className="h-3.5 w-3.5" />
            Sleep
          </TabsTrigger>
          <TabsTrigger value="gym" className="flex-1 min-w-[100px] gap-1.5 text-xs rounded-lg data-[state=active]:bg-[hsl(199_100%_50%/0.12)] data-[state=active]:text-[hsl(199_100%_55%)]">
            <Dumbbell className="h-3.5 w-3.5" />
            Gym
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dreams" className="mt-4">
          <DreamJournal />
        </TabsContent>

        <TabsContent value="medications" className="mt-4">
          <MedicationTracker />
        </TabsContent>

        <TabsContent value="sleep" className="mt-4">
          <WeeklySleepTracker />
        </TabsContent>

        <TabsContent value="gym" className="mt-4">
          <GymTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MentalHealthHub;
