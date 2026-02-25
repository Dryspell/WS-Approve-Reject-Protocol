import { Component, Show, For } from "solid-js";
import type { Unit, UnitTaskQueue } from "~/module_bindings/types";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

interface UnitDetailsPanelProps {
  unit: Unit | undefined;
  taskQueues: Record<number, UnitTaskQueue[]>;
  onVoteColorChange: (unitId: number, color: string) => void;
  onVoteTrade: (unitId: number, price: number) => void;
  onCancelTask: (taskId: number) => void;
}

const UnitDetailsPanel: Component<UnitDetailsPanelProps> = (props) => {
  return (
    <Show when={props.unit}>
      {(unit) => (
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <div
                class="h-4 w-4 rounded-full"
                style={{ "background-color": unit().voteColor || "#ccc" }}
              />
              <span>Unit {unit().id}</span>
              {unit().isStorage && (
                <Badge variant="secondary">Storage</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {/* Unit Stats */}
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Owner:</span>
                <span class="font-medium">{unit().voteOwner || "None"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Vote Color:</span>
                <span class="font-medium">{unit().voteColor || "None"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Vote Guarantee:</span>
                <span class="font-medium">{unit().voteGuarantee || "None"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Price:</span>
                <span class="font-medium">
                  {unit().votePrice !== null ? `$${unit().votePrice}` : "Not for sale"}
                </span>
              </div>
            </div>

            {/* Vote Color Actions */}
            <div>
              <p class="mb-2 text-sm font-medium text-gray-700">Vote Color</p>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => props.onVoteColorChange(unit().id, "red")}
                  class="bg-red-500 hover:bg-red-600"
                >
                  Red
                </Button>
                <Button
                  size="sm"
                  onClick={() => props.onVoteColorChange(unit().id, "blue")}
                  class="bg-blue-500 hover:bg-blue-600"
                >
                  Blue
                </Button>
                <Button
                  size="sm"
                  onClick={() => props.onVoteColorChange(unit().id, "green")}
                  class="bg-green-500 hover:bg-green-600"
                >
                  Green
                </Button>
              </div>
            </div>

            {/* Trade Actions */}
            <div>
              <p class="mb-2 text-sm font-medium text-gray-700">Market Actions</p>
              {unit().votePrice === null ? (
                <Button
                  size="sm"
                  onClick={() => props.onVoteTrade(unit().id, 100)}
                  class="w-full bg-green-500 hover:bg-green-600"
                >
                  List for Sale ($100)
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => props.onVoteTrade(unit().id, unit().votePrice!)}
                  class="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                  Buy for ${unit().votePrice}
                </Button>
              )}
            </div>

            {/* Task Queue */}
            <div>
              <p class="mb-2 text-sm font-medium text-gray-700">Task Queue</p>
              <div class="space-y-2">
                <For
                  each={props.taskQueues[unit().id] || []}
                  fallback={
                    <div class="rounded border border-dashed p-3 text-center text-sm text-gray-500">
                      No active tasks
                    </div>
                  }
                >
                  {(task) => (
                    <div class="flex items-center justify-between rounded border p-2">
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-medium capitalize">{task.taskType}</span>
                          <Badge
                            variant={
                              task.status === "in_progress"
                                ? "default"
                                : task.status === "completed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {task.status}
                          </Badge>
                        </div>
                        {task.targetId && (
                          <div class="text-xs text-gray-500">
                            Target: {task.targetId}
                          </div>
                        )}
                      </div>
                      <Show when={task.status === "pending"}>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => props.onCancelTask(task.id)}
                        >
                          Cancel
                        </Button>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Show>
  );
};

export default UnitDetailsPanel;

