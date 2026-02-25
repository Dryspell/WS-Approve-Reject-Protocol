import { Component } from "solid-js";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { Vote } from "~/module_bindings/types";

interface VoteCardProps {
  vote: Vote;
  color?: "red" | "blue" | null;
  draggable?: boolean;
  onDragStart?: (vote: Vote) => void;
  onColorChange?: (voteId: number, color: string | null) => void;
  showDetails?: boolean;
}

const VoteCard: Component<VoteCardProps> = (props) => {
  const getColorStyles = () => {
    switch (props.color) {
      case "red":
        return {
          border: "border-red-400",
          bg: "bg-red-50",
          text: "text-red-700",
          icon: "🔴",
        };
      case "blue":
        return {
          border: "border-blue-400",
          bg: "bg-blue-50",
          text: "text-blue-700",
          icon: "🔵",
        };
      default:
        return {
          border: "border-gray-300 border-dashed",
          bg: "bg-gray-50",
          text: "text-gray-700",
          icon: "⚪",
        };
    }
  };

  const styles = getColorStyles();

  return (
    <div
      draggable={props.draggable}
      onDragStart={() => props.onDragStart?.(props.vote)}
      class={`
        rounded-lg border-2 p-3 transition-all
        ${styles.border}
        ${styles.bg}
        ${props.draggable ? "cursor-move hover:shadow-md" : ""}
      `}
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">{styles.icon}</span>
          <div>
            <div class={`font-semibold ${styles.text}`}>
              Vote #{props.vote.id}
            </div>
            {props.showDetails && (
              <div class="text-xs text-gray-500">
                {props.vote.playerId === props.vote.originalOwner
                  ? "Original"
                  : "Purchased"}
              </div>
            )}
          </div>
        </div>

        {props.color && props.onColorChange && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => props.onColorChange?.(props.vote.id, null)}
            class="text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {!props.color && props.draggable && (
        <div class="mt-2 text-center text-xs text-gray-500">
          Drag to Red or Blue zone
        </div>
      )}

      {props.showDetails && props.vote.originalOwner !== props.vote.playerId && (
        <Badge variant="outline" class="mt-2 w-full justify-center text-xs">
          From: {props.vote.originalOwner.slice(0, 8)}...
        </Badge>
      )}
    </div>
  );
};

export default VoteCard;

