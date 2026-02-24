"use client";

import { Button } from "@/components/ui/button";

interface Edit {
  id: string;
  user_message: string;
  ai_explanation: string;
  created_at: string | null;
}

interface VersionHistoryProps {
  edits: Edit[];
  onRevert: (editId: string) => void;
}

export function VersionHistory({ edits, onRevert }: VersionHistoryProps) {
  if (edits.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No edit history yet
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h4 className="text-sm font-medium">Edit History</h4>
      {edits.map((edit, i) => (
        <div
          key={edit.id}
          className="flex items-start justify-between rounded border p-2 text-xs"
        >
          <div className="flex-1">
            <p className="font-medium">{edit.user_message}</p>
            <p className="text-muted-foreground">{edit.ai_explanation}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => onRevert(edit.id)}
          >
            Revert
          </Button>
        </div>
      ))}
    </div>
  );
}
