import { createSignal, onMount, onCleanup, createEffect, Accessor } from "solid-js";
import {
  ColonySceneManager,
  type ColonyUnit,
  type ColonyResource,
  type ColonyBuilding,
  type OtherPlayerAvatar,
  type TeamColor,
  type ActiveTradeOffer,
} from "~/lib/colony-scene";
import type { CharacterClass } from "~/lib/asset-loader";

export type { TeamColor, ColonyUnit, ColonyResource, ColonyBuilding, OtherPlayerAvatar, ActiveTradeOffer } from "~/lib/colony-scene";

export interface ColonyViewportProps {
  units: ColonyUnit[];
  resources?: ColonyResource[];
  buildings?: ColonyBuilding[];
  selectedIds: Accessor<number[]>;
  onSelect: (ids: number[]) => void;
  onMoveUnit?: (id: number, x: number, z: number) => void;
  onSetTeam?: (ids: number[], team: TeamColor) => void;
  onSelectResource?: (id: string) => void;
  playerName?: string;
  playerCharacter?: CharacterClass;
  otherPlayers?: OtherPlayerAvatar[];
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
  hoveredUnitId?: number | null;
  hoveredOwnerId?: string | null;
  localPlayerId?: string;
  activeOffers?: ActiveTradeOffer[];
  onTradeOfferClick?: (offerId: number, screenX: number, screenY: number) => void;
  onHoverUnit?: (id: number | null) => void;
  onHoverPlayer?: (id: string | null) => void;
  onWorldContextMenu?: (target: { unitId?: number; playerId?: string }, x: number, y: number) => void;
}

export default function ColonyViewport(props: ColonyViewportProps) {
  let canvasRef!: HTMLDivElement;
  let manager: ColonySceneManager | undefined;

  const [loadingProgress, setLoadingProgress] = createSignal(0);
  const [assetsReady, setAssetsReady] = createSignal(false);

  onCleanup(() => {
    manager?.dispose();
    manager = undefined;
  });

  onMount(() => {
    manager = new ColonySceneManager(canvasRef, {
      onSelect: (ids) => props.onSelect(ids),
      onMoveUnit: (id, x, z) => props.onMoveUnit?.(id, x, z),
      onPositionUpdate: (x, z, rotY, moving) => props.onPositionUpdate?.(x, z, rotY, moving),
      onLoadProgress: setLoadingProgress,
      onAssetsReady: () => setAssetsReady(true),
      onTradeOfferClick: (offerId, sx, sy) => props.onTradeOfferClick?.(offerId, sx, sy),
      onHoverUnit: (id) => props.onHoverUnit?.(id),
      onHoverPlayer: (id) => props.onHoverPlayer?.(id),
      onWorldContextMenu: (target, x, y) => props.onWorldContextMenu?.(target, x, y),
      getSelectedIds: () => props.selectedIds(),
    });

    manager.init(
      props.units,
      props.resources,
      props.playerName,
      props.playerCharacter,
    );
  });

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

  createEffect(() => {
    manager?.setLocalPlayerId(props.localPlayerId ?? null);
  });

  createEffect(() => {
    const unitId = props.hoveredUnitId ?? null;
    const ownerId = props.hoveredOwnerId ?? null;
    manager?.setHoverFocus(
      unitId != null || ownerId
        ? { unitId: unitId ?? undefined, ownerId: ownerId ?? undefined }
        : null,
    );
  });

  createEffect(() => {
    const offers = props.activeOffers;
    if (offers) manager?.updateTradeOffers(offers);
  });

  createEffect(() => {
    const buildings = props.buildings;
    if (buildings) manager?.syncBuildings(buildings);
  });

  // IMPORTANT — SolidJS + imperative DOM (Three.js canvas) pitfall:
  //
  // The Three.js renderer appends a <canvas> to `canvasRef` imperatively via
  // container.appendChild(renderer.domElement). SolidJS doesn't know about this
  // child — it only tracks children it created through JSX.
  //
  // If `canvasRef` also contained reactive JSX children (e.g. a loading overlay
  // driven by a signal), SolidJS would reconcile that reactive region whenever
  // the signal changed. During reconciliation it clears and rebuilds the dynamic
  // content, which *removes all sibling nodes* — including the imperative canvas.
  //
  // Fix: `canvasRef` must have ZERO JSX children. Any reactive UI (loading
  // indicators, overlays) must live in a SIBLING div, never inside the same
  // container that Three.js appends to.
  return (
    <div class="relative h-full w-full">
      {/* Three.js canvas target — must have NO reactive children (see above) */}
      <div ref={canvasRef} class="absolute inset-0" />

      {/* Loading overlay — MUST be a sibling, not inside canvasRef */}
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
