import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, RefreshCw } from "lucide-react";

interface ActionButtonsProps {
  onClearHistory: () => void;
  onExportCSV: () => void;
  onChangePair: () => void;
  hasHistory: boolean;
}

const ActionButtons = ({
  onClearHistory,
  onExportCSV,
  onChangePair,
  hasHistory,
}: ActionButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={!hasHistory} size="sm" className="gap-1.5 h-9 text-xs font-medium">
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all trade history?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your
              trade calculations from this session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClearHistory}>
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="outline" onClick={onExportCSV} disabled={!hasHistory} size="sm" className="gap-1.5 h-9 text-xs font-medium">
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-medium">
            <RefreshCw className="h-3.5 w-3.5" />
            Change Pair
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change trading pair?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the pair will clear your current trade history and totals.
              Make sure to export your data if needed before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onChangePair}>
              Change Pair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActionButtons;
