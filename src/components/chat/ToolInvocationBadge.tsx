"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({
  toolInvocation,
}: ToolInvocationBadgeProps) {
  const isComplete =
    toolInvocation.state === "result" && Boolean(toolInvocation.result);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">
        {getToolDescription(toolInvocation)}
      </span>
    </div>
  );
}

function getToolDescription(toolInvocation: ToolInvocation): string {
  const { toolName } = toolInvocation;
  const args = (toolInvocation.args ?? {}) as Record<string, unknown>;

  if (toolName === "str_replace_editor") {
    const command = args.command as string | undefined;
    const path = (args.path as string | undefined) || "a file";

    switch (command) {
      case "create":
        return `Creating ${path}`;
      case "view":
        return `Viewing ${path}`;
      case "undo_edit":
        return `Undoing last edit to ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      default:
        return `Editing ${path}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string | undefined;
    const path = (args.path as string | undefined) || "a file";
    const newPath = args.new_path as string | undefined;

    if (command === "rename" && newPath) {
      return `Renaming ${path} to ${newPath}`;
    }
    if (command === "delete") {
      return `Deleting ${path}`;
    }
    return `Updating ${path}`;
  }

  return toolName;
}
