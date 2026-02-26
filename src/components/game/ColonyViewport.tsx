import { createSignal, onMount, onCleanup, createEffect, Accessor } from "solid-js";
import {
  ColonySceneManager,
  type ColonyUnit,
  type ColonyResource,
  type OtherPlayerAvatar,
  type TeamColor,
} from "~/lib/colony-scene";
import type { CharacterClass } from "~/lib/asset-loader";

export type { TeamColor, ColonyUnit, ColonyResource, OtherPlayerAvatar } from "~/lib/colony-scene";

export interface ColonyViewportProps {
  units: ColonyUnit[];
  resources?: ColonyResource[];
  selectedIds: Accessor<number[]>;
  onSelect: (ids: number[]) => void;
  onMoveUnit?: (id: number, x: number, z: number) => void;
  onSetTeam?: (ids: number[], team: TeamColor) => void;
  onSelectResource?: (id: string) => void;
  playerName?: string;
  playerCharacter?: CharacterClass;
  otherPlayers?: OtherPlayerAvatar[];
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
}

export default function ColonyViewport(props: ColonyViewportProps) {
  let containerRef!: HTMLDivElement;
  let manager: ColonySceneManager | undefined;

  const [loadingProgress, setLoadingProgress] = createSignal(0);
  const [assetsReady, setAssetsReady] = createSignal(false);

  onCleanup(() => {
    manager?.dispose();
    manager = undefined;
  });

  onMount(() => {
    manager = new ColonySceneManager(containerRef, {
      onSelect: (ids) => props.onSelect(ids),
      onMoveUnit: (id, x, z) => props.onMoveUnit?.(id, x, z),
      onPositionUpdate: (x, z, rotY, moving) => props.onPositionUpdate?.(x, z, rotY, moving),
      onLoadProgress: setLoadingProgress,
      onAssetsReady: () => setAssetsReady(true),
      getSelectedIds: () => props.selectedIds(),
    });

    manager.init(
      props.units,
      props.resources,
      props.playerName,
      props.playerCharacter,
    );
  });

  // Reactive bridges to scene manager
  createEffect(() => {
    const units = props.units;
    manager?.updateTeamColors(units);
  });

  createEffect(() => {
    props.selectedIds();
    manager?.syncSelectionVisuals();
  });

  createEffect(() => {
    const units = props.units;
    manager?.updateUnitPositions(units);
  });

  createEffect(() => {
    const units = props.units;
    manager?.syncUnits(units);
  });

  createEffect(() => {
    const players = props.otherPlayers;
    if (players) manager?.updateOtherPlayers(players);
  });

  return (
    <div ref={containerRef} class="relative h-full w-full">
      {!assetsReady() && (
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1a1a10]/80 backdrop-blur-sm">
          <div class="mb-3 text-sm font-medium text-white/60">Loading colony...</div>
          <div class="h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadingProgress()}%` }}
            />
          </div>
          <div class="mt-2 text-xs text-white/30">{loadingProgress()}%</div>
        </div>
      )}
    </div>
  );
}
