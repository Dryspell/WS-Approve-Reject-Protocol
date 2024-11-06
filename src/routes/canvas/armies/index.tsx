import { Accessor, createSignal, For, onMount, Setter, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { applyTerrain, renderGrid } from "~/lib/canvas/grids";
import { line } from "~/lib/canvas/shapes";
import {
  RiMediaPauseLine,
  RiMediaPlayFill,
  RiMediaRewindFill,
  RiMediaSpeedFill,
} from "solid-icons/ri";
import { isAdjacentTo } from "~/lib/canvas/pathfinding/utils";
import { createStore, SetStoreFunction } from "solid-js/store";
import {
  _hasCombatData,
  _hasIdentificationData,
  _hasPos,
  _hasRenderData,
  CombatEvent,
  GameChatMessage,
  GameEvent,
  Unit,
} from "../combat/types";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { generateCombatEvent, processCombatEvents } from "../combat/combatEvents";
import { generateMinionsAndTargets, generateTerrain } from "./init";
import { drawUnit } from "./render";
import { handleUnitMovement } from "./update";
import { getMousePosition } from "../utils";

const initializeGame = (
  gameCanvas: HTMLCanvasElement | undefined,
  terrain: ReturnType<typeof generateTerrain>,
  units: Unit[],
) => {
  if (!gameCanvas) {
    console.error("Canvas element is not defined");
    return () => {};
  }
  const ctx = gameCanvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2d context from canvas");
    return () => {};
  }
  const [canvasWidth, canvasHeight] = [gameCanvas.width, gameCanvas.height] as [
    width: number,
    height: number,
  ];

  const renderGame = (units: Unit[]) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    renderGrid(ctx, terrain, canvasWidth, canvasHeight, cellWidth, cellHeight);

    for (const unit of units) {
      drawUnit(ctx, unit, cellWidth, cellHeight);
      if (unit.movementData?.path?.length) {
        for (let i = 0; i < unit.movementData.path.length; i++) {
          unit.movementData.path[i + 1] &&
            line(
              ctx,
              (unit.movementData.path[i].pos[0] + 0.5) * cellWidth,
              (unit.movementData.path[i].pos[1] + 0.5) * cellHeight,
              (unit.movementData.path[i + 1].pos[0] + 0.5) * cellWidth,
              (unit.movementData.path[i + 1].pos[1] + 0.5) * cellHeight,
              {
                strokeStyle: "green",
                lineWidth: 1,
              },
            );
        }
      }
    }

    // requestAnimationFrame(gameLoop);
  };

  renderGame(units);
  console.log("Game initialized");

  return renderGame;
};

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const cellWidth = 25;
const cellHeight = 25;

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [tickRate, setTickRate] = createSignal(1000);
  const [tickInterval, setTickInterval] = createSignal<NodeJS.Timeout | undefined>(undefined);

  const [chatBoxRef, setChatBoxRef] = createSignal<HTMLDivElement | undefined>(undefined);
  const [gameChat, setGameChat] = createStore([] as GameChatMessage[]);
  const [gameEvents, setGameEvents] = createStore([] as GameEvent[]);

  const terrain = generateTerrain(CANVAS_WIDTH, CANVAS_HEIGHT, cellWidth, cellHeight);

  const units = generateMinionsAndTargets(cellWidth, cellHeight, terrain);

  const [terrainHoverData, setTerrainHoverData] = createSignal<
    ReturnType<typeof applyTerrain>[number][number] | undefined
  >();
  const [minionHoverData, setMinionHoverData] = createSignal<Unit | undefined>();

  let renderGame = (units: Unit[]) => {};

  const tick = () => {
    console.log("Ticked");
    const combatEvents = [] as CombatEvent[];
    const [minions, targets] = units.reduce(
      (acc, unit) => {
        if (unit.type === "minion") {
          acc[0].push(unit);
        } else {
          acc[1].push(unit);
        }
        return acc;
      },
      [[] as Unit[], [] as Unit[]],
    );

    for (const minion of minions) {
      const nearbyTarget = isAdjacentTo(minion, targets);
      if (nearbyTarget) {
        console.log(
          `Minion at (${minion.pos[0]}, ${minion.pos[1]}) is attacking target at (${nearbyTarget.pos[0]}, ${nearbyTarget.pos[1]})`,
        );
        combatEvents.push(generateCombatEvent(minion, nearbyTarget));
      } else {
        // debugger;
        handleUnitMovement(minion, targets, minions, terrain);
      }
    }
    for (const enemy of targets) {
      const nearbyMinion = isAdjacentTo(enemy, minions);
      if (nearbyMinion) {
        console.log(
          `Target at (${enemy.pos[0]}, ${enemy.pos[1]}) is attacking minion at (${nearbyMinion.pos[0]}, ${nearbyMinion.pos[1]})`,
        );
        combatEvents.push(generateCombatEvent(enemy, nearbyMinion));
      } else {
        handleUnitMovement(enemy, targets, minions, terrain);
      }
    }

    processCombatEvents(combatEvents, units, setGameChat, gameChat);

    setGameEvents([...gameEvents, ...combatEvents]);

    renderGame(units);

    const chatBox = chatBoxRef();
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  };

  onMount(() => {
    const gc = gameCanvas();
    if (gc) {
      console.log("Initializing game...");
      renderGame = initializeGame(gc, terrain, units);

      gc.addEventListener("mousemove", event => {
        getMousePosition(gc, event, (x, y) => {
          const hoveredCellPos = [Math.floor(x / cellWidth), Math.floor(y / cellHeight)];
          try {
            const hoveredCell = terrain[hoveredCellPos[0]][hoveredCellPos[1]];
            // console.log(
            //   `(${hoveredCellPos[0]}, ${hoveredCellPos[1]}): ${hoveredCell.type} (${hoveredCell.movementCost})`,
            // );

            setTerrainHoverData(() => hoveredCell);
          } catch (e) {
            // console.error(e);
            setTerrainHoverData(undefined);
          }

          const hoveredMinion = units.find(
            unit => unit.pos[0] === hoveredCellPos[0] && unit.pos[1] === hoveredCellPos[1],
          );
          if (hoveredMinion) {
            console.log(
              `Hovering over minion at (${hoveredMinion.pos[0]}, ${hoveredMinion.pos[1]})`,
            );
            setMinionHoverData(() => hoveredMinion);
          } else {
            setMinionHoverData(undefined);
          }
        });
      });
    }
    // console.log(gameObjects.players);
  });

  return (
    <main
      // style={{
      //   "min-height": "100vh",
      //   display: "flex",
      //   "flex-direction": "column",
      //   overflow: "hidden",
      // }}
      class="relative mx-auto h-screen p-4 text-gray-700"
    >
      <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
        <ResizablePanel initialSize={0.75} class="overflow-hidden">
          <Resizable orientation="vertical">
            <ResizablePanel
              initialSize={0.7}
              class="flex justify-center overflow-scroll align-middle"
            >
              <div
                class="relative"
                style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, margin: "5px" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "1rem", // Adds space between buttons
                    "align-items": "center", // Aligns items vertically
                    "z-index": 1,
                  }}
                >
                  <Button
                    style={{}}
                    onClick={() => {
                      setTickRate(tickRate() + 250);
                      clearInterval(tickInterval());
                      setTickInterval(setInterval(tick, tickRate()));
                    }}
                  >
                    <RiMediaRewindFill />
                  </Button>
                  <Button
                    style={{}}
                    onClick={() => {
                      tick();
                    }}
                  >
                    Tick
                  </Button>
                  <Button
                    style={{}}
                    onClick={() => {
                      if (tickInterval()) {
                        clearInterval(tickInterval());
                        setTickInterval(undefined);
                      } else {
                        setTickInterval(setInterval(tick, tickRate()));
                      }
                    }}
                  >
                    {tickInterval() ? <RiMediaPauseLine /> : <RiMediaPlayFill />}
                  </Button>
                  <Button
                    style={{}}
                    onClick={() => {
                      setTickRate(Math.max(tickRate() - 250, 0));
                      clearInterval(tickInterval());
                      setTickInterval(setInterval(tick, tickRate()));
                    }}
                  >
                    <RiMediaSpeedFill />
                  </Button>
                </div>

                <canvas
                  ref={setGameCanvas}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  style={{
                    "justify-content": "center",
                    "align-items": "center",
                    position: "relative",
                    width: `${CANVAS_WIDTH}px`,
                    height: `${CANVAS_HEIGHT}px`,
                    border: "1px solid black",
                  }}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel initialSize={0.3} class="overflow-hidden">
              <div
                ref={setChatBoxRef}
                style={{
                  "max-height": "200px",
                  "overflow-y": "scroll",
                  "border-top": "1px solid black",
                  "border-bottom": "1px solid black",
                  "margin-top": "1rem",
                }}
              >
                <For each={gameChat}>
                  {message => (
                    <div class="my-2 rounded-lg bg-gray-200 p-2">
                      <span class="text-sm font-semibold">{`${message.sender}: `}</span>
                      <span class="text-sm">{message.message}</span>
                    </div>
                  )}
                </For>
              </div>
            </ResizablePanel>
          </Resizable>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel initialSize={0.25} class="overflow-hidden">
          <div>Hover Info</div>
          <Show when={terrainHoverData()}>
            <div class="border">
              <div>{`(${terrainHoverData()?.x}, ${terrainHoverData()?.y})`}</div>
              <div>{`Terrain: ${terrainHoverData()?.type}, Movement Cost:${terrainHoverData()?.movementCost}`}</div>
            </div>
          </Show>
          <Show when={minionHoverData()}>
            <div class="border">
              <div>{`Unit: ${minionHoverData()?.type}`}</div>
              <div>{`Name: ${minionHoverData()?.name}`}</div>
              <div>{`ID: ${minionHoverData()?.id}`}</div>
              <div>{`Position: (${minionHoverData()?.pos[0]}, ${minionHoverData()?.pos[1]})`}</div>
              <div>{`Health: ${minionHoverData()?.hp}/${minionHoverData()?.maxHp}`}</div>
              <div>{`Mana: ${minionHoverData()?.mana}/${minionHoverData()?.maxMana}`}</div>
              <div>{`Stamina: ${minionHoverData()?.stamina}/${minionHoverData()?.maxStamina}`}</div>
              <div>{`Attack: ${minionHoverData()?.attack}`}</div>
              <div>{`Defense: ${minionHoverData()?.defense}`}</div>
              <div>{`Speed: ${minionHoverData()?.speed}`}</div>
              <div>{`Accuracy: ${minionHoverData()?.accuracy}`}</div>
              <div>{`Block Chance: ${minionHoverData()?.blockChance}`}</div>
              <div>{`Evasion: ${minionHoverData()?.evasion}`}</div>
              <div>{`Crit Chance: ${minionHoverData()?.critChance}`}</div>
              <div>{`Crit Multiplier: ${minionHoverData()?.critMultiplier}`}</div>
            </div>
          </Show>
        </ResizablePanel>
      </Resizable>
    </main>
  );
}
