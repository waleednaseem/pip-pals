import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { TimeUnit } from "@/types/calculator";
import { buildDurationDetails } from "@/utils/time";

const unitOptions: TimeUnit[] = ["Minutes", "Hours", "Days", "Minutes_5", "Minutes_30", "Hours_4"];

const TimeConversion = () => {
  const [timeValue, setTimeValue] = useState("");
  const [unit, setUnit] = useState<TimeUnit>("Minutes");

  const { message, isValid, showMessage } = useMemo(() => {
    if (timeValue.trim() === "") {
      return { message: "", isValid: false, showMessage: false };
    }

    const parsedValue = parseFloat(timeValue);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      return {
        message: "Please enter a valid time",
        isValid: false,
        showMessage: true,
      };
    }

    const details = buildDurationDetails(parsedValue, unit);

    return {
      message: details.formatted,
      isValid: true,
      showMessage: true,
    };
  }, [timeValue, unit]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Time Conversion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeValue">Time value</Label>
              <Input
                id="timeValue"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="e.g., 90"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
                className="font-mono-num"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeUnit">Unit</Label>
              <Select value={unit} onValueChange={(value) => setUnit(value as TimeUnit)}>
                <SelectTrigger id="timeUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "Minutes_5"
                        ? "5 minutes"
                        : option === "Minutes_30"
                        ? "30 minutes"
                        : option === "Hours_4"
                        ? "4 hours"
                        : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showMessage && (
            <div className={`text-sm font-medium ${isValid ? "text-primary" : "text-destructive"}`}>
              {message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeConversion;

