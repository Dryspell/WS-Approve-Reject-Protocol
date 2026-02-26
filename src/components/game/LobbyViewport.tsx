import { onMount, onCleanup, createEffect, createSignal, Accessor } from "solid-js";
import { LobbySceneManager, type LobbyPlayer } from "~/lib/lobby-scene";
import type { CharacterClass } from "~/lib/asset-loader";

export type { LobbyPlayer } from "~/lib/lobby-scene";

export interface LobbyViewportProps {
  playerName: string;
  playerCharacter?: CharacterClass;
  otherPlayers: LobbyPlayer[];
  onBuildingInteract?: (buildingId: string | null) => void;
  onPlayerClick?: (playerId: string) => void;
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
  nearBuilding?: Accessor<string | null>;
}

export default function LobbyViewport(props: LobbyViewportProps) {
  let containerRef!: HTMLDivElement;
  let manager: LobbySceneManager | undefined;
  const [loadProgress, setLoadProgress] = createSignal(0);

  onCleanup(() => {
    manager?.dispose();
    manager = undefined;
  });

  onMount(() => {
    manager = new LobbySceneManager(containerRef, {
      onBuildingInteract: (id) => props.onBuildingInteract?.(id),
      onPositionUpdate: (x, z, rotY, moving) => props.onPositionUpdate?.(x, z, rotY, moving),
      onLoadProgress: setLoadProgress,
    });

    manager.init(props.playerName, props.playerCharacter || "knight");
  });

  createEffect(() => {
    const players = props.otherPlayers;
    manager?.updateOtherPlayers(players);
  });

  return (
    <div
      ref={containerRef!}
      class="w-full h-full relative"
      data-testid="lobby-viewport"
      data-loaded={loadProgress() >= 100 ? "true" : "false"}
      style={{ "touch-action": "none", "background": "#1a2a15" }}
    >
      {loadProgress() < 100 && loadProgress() > 0 && (
        <div class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div class="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 text-white text-sm">
            Loading lobby... {loadProgress()}%
          </div>
        </div>
      )}
    </div>
  );
}
