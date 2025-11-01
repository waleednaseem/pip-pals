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
    <div className="flex flex-wrap gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={!hasHistory} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Clear History
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

      <Button
        variant="outline"
        onClick={onExportCSV}
        disabled={!hasHistory}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
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
