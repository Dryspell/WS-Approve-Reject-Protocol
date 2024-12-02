import { createSignal, For, onMount, Show } from "solid-js";
import { createMutable, createStore, SetStoreFunction } from "solid-js/store";
import { _hasPos, GameChatMessage, GameEvent, Unit } from "../combat/types";
import { circle, rect } from "~/lib/canvas/shapes";
import { getMousePosition } from "../utils";
import { centroid, computePath, distance2, withinCircle, withinRect } from "./spatial";
import { drawTargetsAndMove } from "./loop";
import { CANVAS_HEIGHT, CANVAS_WIDTH, generateUnits } from "./constants";
import { createRectFormation } from "./formations";
import munkres from "munkres-js";
import { svgGen } from "~/icons/svgGeneration";
import { SIRedmine } from "~/icons/SIRedmine";
import { TbTrees } from "~/icons/TbTrees";
import { Structure, Resource, Workshop } from "./types";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { anvil } from "~/icons/anvil";
import { ImHome } from "~/icons/ImHome";
import { AiOutlineSkin } from "~/icons/AiOutlineSkin";

const arrangeCircularly = (center: [number, number], radius: number, count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [
      Math.floor(center[0] + radius * Math.cos(angle)),
      Math.floor(center[1] + radius * Math.sin(angle)),
    ] as [x: number, y: number];
  });
};

const initializeGame = (gameCanvas: HTMLCanvasElement, units: Unit[]) => {
  const ctx = gameCanvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2d context from canvas");
    return;
  }
  const canvasSize = [gameCanvas.width, gameCanvas.height] as [width: number, height: number];

  const IMAGES = {
    mine: svgGen(SIRedmine),
    blacksmith: svgGen(anvil),
    townhall: svgGen(ImHome),
    leatherworkshop: svgGen(AiOutlineSkin),
    tree: svgGen(TbTrees),
  };

  const circularArrangement = arrangeCircularly([canvasSize[0] / 2, canvasSize[1] / 2], 200, 5);

  const resources: Resource[] = [
    { type: "gold", image: "mine", amount: 100, pos: circularArrangement[0], dims: [40, 40] },
    { type: "wood", image: "tree", amount: 100, pos: circularArrangement[1], dims: [40, 40] },
  ];

  const buildings: Structure[] = [
    { type: "blacksmith", image: "blacksmith", pos: circularArrangement[2], dims: [40, 40] },
    {
      type: "leatherworkshop",
      image: "leatherworkshop",
      pos: circularArrangement[3],
      dims: [40, 40],
    },
    {
      type: "townhall",
      image: "townhall",
      pos: [gameCanvas.width / 2, gameCanvas.height / 2],
      dims: [40, 40],
    },
  ];

  let isDragging = false;
  let dragStart: [number, number] = [0, 0];
  let dragEnd: [number, number] = [0, 0];

  const selectedUnits = new Set<Unit>();

  gameCanvas.addEventListener("mousedown", e => {
    if (!isDragging && e.button === 0) {
      getMousePosition(gameCanvas, e, (x, y) => {
        dragStart = [x, y];
      });
      isDragging = true;
    }
  });

  gameCanvas.addEventListener("mousemove", e => {
    if (isDragging && e.button === 0) {
      getMousePosition(gameCanvas, e, (x, y) => {
        dragEnd = [x, y];
      });

      for (const unit of units) {
        if (withinRect(unit.pos, dragStart, dragEnd)) {
          selectedUnits.add(unit);
        } else {
          selectedUnits.delete(unit);
        }
      }
    }
  });

  gameCanvas.addEventListener("mouseup", e => {
    if (isDragging && e.button === 0) {
      isDragging = false;
    }
  });

  gameCanvas.addEventListener("contextmenu", e => {
    e.preventDefault();
    if (selectedUnits.size) {
      getMousePosition(gameCanvas, e, (x, y) => {
        const formation = createRectFormation(
          selectedUnits.size,
          2,
          Math.ceil(selectedUnits.size / 2),
          [x, y],
          centroid(Array.from(selectedUnits)),
          { cellWidth: 15, cellHeight: 15 },
        );

        // Use Kuhn-Munkres algorithm to find the optimal assignment of units to formation positions by minimizing distance costs
        const unitsArray = Array.from(selectedUnits);
        munkres(unitsArray.map(unit => formation.map(pos => distance2(unit, { pos })))).forEach(
          ([worker, job]) => {
            unitsArray[worker].movementData = {
              target: { pos: formation[job] },
              path: computePath(unitsArray[worker].pos, [formation[job]], resources).map(pos => ({
                pos,
              })),
              distanceToTarget: 0,
            };
          },
        );
      });
    }
  });

  const gameLoop = () => {
    ctx.clearRect(0, 0, ...canvasSize);
    resources.forEach(resource => {
      ctx.drawImage(IMAGES[resource.image], ...resource.pos, ...resource.dims);
    });

    buildings.forEach(building => {
      ctx.drawImage(IMAGES[building.image], ...building.pos, ...building.dims);
    });

    if (isDragging) {
      rect(ctx, dragStart[0], dragStart[1], dragEnd[0] - dragStart[0], dragEnd[1] - dragStart[1], {
        fillStyle: "rgba(0, 0, 0, 0.2)",
      });
    }

    units.forEach(unit => {
      circle(ctx, ...unit.pos, unit.dims[0], {
        fillStyle: unit.fillStyle,
        ...(selectedUnits.has(unit) ? { strokeStyle: "green", lineWidth: 2 } : {}),
      });
      drawTargetsAndMove(ctx, unit, units);
    });

    requestAnimationFrame(gameLoop);
  };

  gameLoop();
};

// const gameTick = (
//   units: Unit[],
//   gameChat: GameChatMessage[],
//   setGameChat: SetStoreFunction<GameChatMessage[]>,
//   gameEvents: GameEvent[],
//   setGameEvents: SetStoreFunction<GameEvent[]>,
// ) => {
//   const attackers = units;
//   const defenders = units;

//   const newAttackEvents = attackers.map(attacker => {
//     const defender = defenders.find(p => p.id !== attacker.id);
//     if (!defender) {
//       throw new Error("No defender found");
//     }
//     return generateCombatEvent(attacker, defender);
//   });

//   processCombatEvents(newAttackEvents, units, setGameChat, gameChat);

//   setGameEvents([...gameEvents, ...newAttackEvents]);
// };

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);

  const units = createMutable(generateUnits(25));
  const [minionHoverData, setMinionHoverData] = createSignal<Unit | undefined>();

  const [chatBoxRef, setChatBoxRef] = createSignal<HTMLDivElement | undefined>(undefined);
  const [gameChat, setGameChat] = createStore([] as GameChatMessage[]);
  const [gameEvents, setGameEvents] = createStore([] as GameEvent[]);

  onMount(() => {
    const gc = gameCanvas();
    if (!gc) return;

    initializeGame(gc, units);

    gc.addEventListener("mousemove", event => {
      const [mouseX, mouseY] = getMousePosition(gc, event, (x, y) => {});
      const hoveredMinion = units.find(unit =>
        withinCircle([mouseX, mouseY], unit.pos, unit.dims[0]),
      );

      if (hoveredMinion) {
        console.log(`Hovering over minion at (${hoveredMinion.pos[0]}, ${hoveredMinion.pos[1]})`);
        setMinionHoverData(() => hoveredMinion);
      } else {
        setMinionHoverData(() => undefined);
      }
    });
    // console.log(gameObjects.players);
  });

  return (
    <main class="relative mx-auto p-4 text-gray-700">
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
                  {/* <Button
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
                  </Button> */}
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
          {/* <Show when={terrainHoverData()}>
            <div class="border">
              <div>{`(${terrainHoverData()?.x}, ${terrainHoverData()?.y})`}</div>
              <div>{`Terrain: ${terrainHoverData()?.type}, Movement Cost:${terrainHoverData()?.movementCost}`}</div>
            </div>
          </Show> */}
          <Show when={minionHoverData()}>
            <div class="border">
              <div>{`Unit: ${minionHoverData()?.type}`}</div>
              <div>{`Name: ${minionHoverData()?.name}`}</div>
              <div>{`ID: ${minionHoverData()?.id}`}</div>
              <div>{`Position: (${minionHoverData()?.pos[0].toFixed(2)}, ${minionHoverData()?.pos[1].toFixed(2)})`}</div>
              <div>{`Path: ${JSON.stringify(minionHoverData()?.movementData?.path, null, 4)}`}</div>
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
