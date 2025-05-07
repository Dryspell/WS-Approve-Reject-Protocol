import { Accessor } from "solid-js";
import { Badge } from "~/components/ui/badge";
import { Progress, ProgressLabel, ProgressValueLabel } from "~/components/ui/progress";
import { Unit } from "./types";
import { getPagePosition } from "./utils";

export const FollowingUI = (props: {
  gameCanvas: Accessor<HTMLCanvasElement | undefined>;
  player: Unit;
}) => {
  const pos = () => getPagePosition(props.gameCanvas(), ...props.player.pos);
  const progressScaleFactor = 1.5;

  return (
    <div style={{ position: "absolute", left: `${pos()[0]}px`, top: `${pos()[1] - 150}px` }}>
      <Badge>{props.player.name}</Badge>
      <Progress
        value={props.player.hp}
        minValue={0}
        maxValue={props.player.maxHp}
        getValueLabel={({ value, max }) => `${value} / ${max}`}
        class="my-2 w-[300px] space-y-1"
        style={{
          width: `${props.player.dims[0] * progressScaleFactor}px`,
        }}
        color="bg-red-500"
      >
        <div class="flex justify-between">
          <ProgressLabel>Health:</ProgressLabel>
          <ProgressValueLabel />
        </div>
      </Progress>
      <Progress
        value={props.player.mana}
        minValue={0}
        maxValue={props.player.maxMana}
        getValueLabel={({ value, max }) => `${value} / ${max}`}
        class="my-2 w-[300px] space-y-1"
        style={{
          width: `${props.player.dims[0] * progressScaleFactor}px`,
        }}
        color="bg-blue-500"
      >
        <div class="flex justify-between">
          <ProgressLabel>Mana:</ProgressLabel>
          <ProgressValueLabel />
        </div>
      </Progress>
      <Progress
        value={props.player.stamina}
        minValue={0}
        maxValue={props.player.maxStamina}
        getValueLabel={({ value, max }) => `${value} / ${max}`}
        class="my-2 w-[300px] space-y-1"
        style={{
          width: `${props.player.dims[0] * progressScaleFactor}px`,
        }}
        color="bg-yellow-500"
      >
        <div class="flex justify-between">
          <ProgressLabel>Stamina:</ProgressLabel>
          <ProgressValueLabel />
        </div>
      </Progress>
    </div>
  );
};
