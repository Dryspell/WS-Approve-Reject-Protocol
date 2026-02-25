import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import {
  Application,
  Graphics,
  Text,
  TextStyle,
  Container,
  FederatedPointerEvent,
} from "pixi.js";

const WORLD_W = 1200;
const WORLD_H = 800;
const UNIT_RADIUS = 14;
const UNIT_COUNT = 20;
const PANEL_WIDTH = 280;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

type UnitColor = "red" | "blue" | "unset";

interface UnitData {
  id: number;
  color: UnitColor;
  x: number;
  y: number;
  gfx: Graphics;
  ring: Graphics | null;
}

interface ResourceNode {
  type: "wood" | "stone" | "food" | "metal" | "gems";
  x: number;
  y: number;
}

const RESOURCE_NODES: ResourceNode[] = [
  { type: "wood", x: 200, y: 150 },
  { type: "stone", x: 900, y: 200 },
  { type: "food", x: 500, y: 650 },
  { type: "metal", x: 1050, y: 600 },
  { type: "gems", x: 150, y: 500 },
];

const FILL_FOR_COLOR: Record<UnitColor, number> = {
  red: 0xdd3333,
  blue: 0x3366dd,
  unset: 0x888888,
};

const RESOURCE_FILLS: Record<ResourceNode["type"], number> = {
  wood: 0x8b5a2b,
  stone: 0x999999,
  food: 0xdd8833,
  metal: 0xbbbbcc,
  gems: 0x9933cc,
};

function randomInRange(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}

// ── shape drawing helpers ──

function drawHexagon(g: Graphics, cx: number, cy: number, r: number, fill: number) {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  g.poly(pts, true).fill(fill).stroke({ width: 2, color: 0x000000 });
}

function drawDiamond(g: Graphics, cx: number, cy: number, r: number, fill: number) {
  g.poly([cx, cy - r, cx + r, cy, cx, cy + r, cx - r, cy], true)
    .fill(fill)
    .stroke({ width: 2, color: 0x000000 });
}

function drawStar(g: Graphics, cx: number, cy: number, r: number, fill: number, points = 5) {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  g.poly(pts, true).fill(fill).stroke({ width: 2, color: 0x000000 });
}

function drawResourceShape(g: Graphics, node: ResourceNode) {
  const { type } = node;
  const fill = RESOURCE_FILLS[type];
  const r = 22;
  switch (type) {
    case "wood":
      drawHexagon(g, 0, 0, r, fill);
      break;
    case "stone":
      g.rect(-r, -r, r * 2, r * 2).fill(fill).stroke({ width: 2, color: 0x000000 });
      break;
    case "food":
      g.circle(0, 0, r).fill(fill).stroke({ width: 2, color: 0x000000 });
      break;
    case "metal":
      drawDiamond(g, 0, 0, r, fill);
      break;
    case "gems":
      drawStar(g, 0, 0, r, fill);
      break;
  }
}

// ── component ──

export default function PixiSpike() {
  let containerRef!: HTMLDivElement;

  const [units, setUnits] = createSignal<UnitData[]>([]);
  const [selectedIds, setSelectedIds] = createSignal<Set<number>>(new Set());
  const [fps, setFps] = createSignal(0);
  const [rendererInfo, setRendererInfo] = createSignal("");

  const selectedUnits = () => {
    const ids = selectedIds();
    return units().filter(u => ids.has(u.id));
  };

  onMount(async () => {
    const app = new Application();

    await app.init({
      background: 0x1a1a2e,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    containerRef.appendChild(app.canvas as HTMLCanvasElement);

    const resizeCanvas = () => {
      const w = containerRef.clientWidth;
      const h = containerRef.clientHeight;
      if (w > 0 && h > 0) app.renderer.resize(w, h);
    };
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(containerRef);

    // renderer info
    const gl = (app.canvas as HTMLCanvasElement).getContext("webgl2");
    const version = gl
      ? `WebGL2 – ${gl.getParameter(gl.RENDERER)}`
      : "WebGL";
    setRendererInfo(version);

    // world container for pan/zoom
    const world = new Container();
    app.stage.addChild(world);

    // ── background (for pan detection) ──
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_W, WORLD_H).fill(0x16213e);
    bg.eventMode = "static";
    bg.cursor = "grab";
    world.addChild(bg);

    // ── grid lines ──
    const gridGfx = new Graphics();
    gridGfx.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.06 });
    for (let x = 0; x <= WORLD_W; x += 100) {
      gridGfx.moveTo(x, 0).lineTo(x, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += 100) {
      gridGfx.moveTo(0, y).lineTo(WORLD_W, y);
    }
    gridGfx.stroke();
    world.addChild(gridGfx);

    // ── resource nodes ──
    for (const node of RESOURCE_NODES) {
      const rc = new Container();
      rc.position.set(node.x, node.y);
      const shape = new Graphics();
      drawResourceShape(shape, node);
      rc.addChild(shape);

      const label = new Text({
        text: node.type,
        style: new TextStyle({
          fontFamily: "Arial",
          fontSize: 11,
          fill: 0xffffff,
          fontWeight: "bold",
        }),
      });
      label.anchor.set(0.5, 0);
      label.position.set(0, 26);
      rc.addChild(label);
      world.addChild(rc);
    }

    // ── storage building ──
    const storageC = new Container();
    storageC.position.set(WORLD_W / 2, WORLD_H / 2);
    const storageRect = new Graphics();
    storageRect.rect(-40, -30, 80, 60).fill(0x666666).stroke({ width: 2, color: 0xaaaaaa });
    storageC.addChild(storageRect);
    const storageLabel = new Text({
      text: "Storage",
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 13,
        fill: 0xffffff,
        fontWeight: "bold",
      }),
    });
    storageLabel.anchor.set(0.5, 0.5);
    storageC.addChild(storageLabel);
    world.addChild(storageC);

    // ── units ──
    const unitDataArr: UnitData[] = [];

    for (let i = 0; i < UNIT_COUNT; i++) {
      const x = randomInRange(UNIT_RADIUS + 20, WORLD_W - UNIT_RADIUS - 20);
      const y = randomInRange(UNIT_RADIUS + 20, WORLD_H - UNIT_RADIUS - 20);

      const gfx = new Graphics();
      gfx.circle(0, 0, UNIT_RADIUS).fill(FILL_FOR_COLOR.unset);
      gfx.position.set(x, y);
      gfx.eventMode = "static";
      gfx.cursor = "pointer";
      world.addChild(gfx);

      const ud: UnitData = { id: i, color: "unset", x, y, gfx, ring: null };
      unitDataArr.push(ud);
    }

    setUnits([...unitDataArr]);

    // ── helpers ──

    function syncSignals() {
      setUnits(unitDataArr.map(u => ({ ...u })));
    }

    function addSelectionRing(ud: UnitData) {
      if (ud.ring) return;
      const ring = new Graphics();
      ring.circle(0, 0, UNIT_RADIUS + 4)
        .stroke({ width: 2.5, color: 0x33ff66 });
      ud.gfx.addChild(ring);
      ud.ring = ring;
    }

    function removeSelectionRing(ud: UnitData) {
      if (!ud.ring) return;
      ud.gfx.removeChild(ud.ring);
      ud.ring.destroy();
      ud.ring = null;
    }

    function selectUnit(id: number, multi: boolean) {
      const next = multi ? new Set(selectedIds()) : new Set<number>();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSelectedIds(next);

      for (const ud of unitDataArr) {
        if (next.has(ud.id)) addSelectionRing(ud);
        else removeSelectionRing(ud);
      }
      syncSignals();
    }

    function clearSelection() {
      for (const ud of unitDataArr) removeSelectionRing(ud);
      setSelectedIds(new Set());
      syncSignals();
    }

    function redrawUnit(ud: UnitData) {
      ud.gfx.clear();
      ud.gfx.circle(0, 0, UNIT_RADIUS).fill(FILL_FOR_COLOR[ud.color]);
      if (ud.ring) {
        ud.ring.clear();
        ud.ring.circle(0, 0, UNIT_RADIUS + 4)
          .stroke({ width: 2.5, color: 0x33ff66 });
      }
    }

    // ── unit pointer interaction (select + drag) ──

    let dragTarget: UnitData | null = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragStartWorld = { x: 0, y: 0 };
    let dragged = false;

    function worldPosFromEvent(e: FederatedPointerEvent) {
      const global = e.global;
      return {
        x: (global.x - world.x) / world.scale.x,
        y: (global.y - world.y) / world.scale.y,
      };
    }

    for (const ud of unitDataArr) {
      ud.gfx.on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        const wp = worldPosFromEvent(e);
        dragged = false;
        dragStartWorld = { x: wp.x, y: wp.y };

        const ids = selectedIds();
        if (ids.has(ud.id)) {
          // start group drag
          dragTarget = ud;
          dragOffsetX = wp.x - ud.gfx.x;
          dragOffsetY = wp.y - ud.gfx.y;
        } else {
          const multi = e.shiftKey;
          selectUnit(ud.id, multi);
          dragTarget = ud;
          dragOffsetX = wp.x - ud.gfx.x;
          dragOffsetY = wp.y - ud.gfx.y;
        }
      });
    }

    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    app.stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (dragTarget) {
        const wp = worldPosFromEvent(e);
        const dx = wp.x - dragStartWorld.x;
        const dy = wp.y - dragStartWorld.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;

        const ids = selectedIds();
        if (ids.size > 1 && ids.has(dragTarget.id)) {
          // group drag – move all selected by delta
          for (const ud of unitDataArr) {
            if (!ids.has(ud.id)) continue;
            ud.gfx.x += (wp.x - dragOffsetX - dragTarget.gfx.x);
            ud.gfx.y += (wp.y - dragOffsetY - dragTarget.gfx.y);
            ud.x = ud.gfx.x;
            ud.y = ud.gfx.y;
          }
          dragOffsetX = wp.x - dragTarget.gfx.x;
          dragOffsetY = wp.y - dragTarget.gfx.y;
        } else {
          dragTarget.gfx.x = wp.x - dragOffsetX;
          dragTarget.gfx.y = wp.y - dragOffsetY;
          dragTarget.x = dragTarget.gfx.x;
          dragTarget.y = dragTarget.gfx.y;
        }
        syncSignals();
      }

      if (isPanning) {
        const dx = e.globalX - panStart.x;
        const dy = e.globalY - panStart.y;
        world.x = panWorldStart.x + dx;
        world.y = panWorldStart.y + dy;
      }
    });

    app.stage.on("pointerup", () => {
      dragTarget = null;
    });
    app.stage.on("pointerupoutside", () => {
      dragTarget = null;
    });

    // ── pan ──
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let panWorldStart = { x: 0, y: 0 };

    bg.on("pointerdown", (e: FederatedPointerEvent) => {
      if (dragTarget) return;
      isPanning = true;
      panStart = { x: e.globalX, y: e.globalY };
      panWorldStart = { x: world.x, y: world.y };
      bg.cursor = "grabbing";
    });

    app.stage.on("pointerup", () => {
      if (isPanning) {
        isPanning = false;
        bg.cursor = "grab";
      }
    });
    app.stage.on("pointerupoutside", () => {
      if (isPanning) {
        isPanning = false;
        bg.cursor = "grab";
      }
    });

    // click on background clears selection
    bg.on("pointerup", (e: FederatedPointerEvent) => {
      if (!dragged && !isPanning) {
        clearSelection();
      }
    });

    // ── zoom ──
    const canvas = app.canvas as HTMLCanvasElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const factor = 1 + dir * 0.1;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, world.scale.x * factor));

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldBefore = {
        x: (mouseX - world.x) / world.scale.x,
        y: (mouseY - world.y) / world.scale.y,
      };

      world.scale.set(newScale);

      world.x = mouseX - worldBefore.x * newScale;
      world.y = mouseY - worldBefore.y * newScale;
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // ── FPS ticker ──
    let frameCount = 0;
    let elapsed = 0;
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaMS;
      frameCount++;
      if (elapsed >= 500) {
        setFps(Math.round((frameCount / elapsed) * 1000));
        frameCount = 0;
        elapsed = 0;
      }
    });

    // expose setColor to signals
    (window as any).__pixiSpike = {
      setColor(color: UnitColor) {
        const ids = selectedIds();
        for (const ud of unitDataArr) {
          if (!ids.has(ud.id)) continue;
          ud.color = color;
          redrawUnit(ud);
        }
        syncSignals();
      },
    };

    onCleanup(() => {
      ro.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      app.destroy(true, { children: true });
      delete (window as any).__pixiSpike;
    });
  });

  const handleSetColor = (color: UnitColor) => {
    (window as any).__pixiSpike?.setColor(color);
  };

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-gray-950">
      {/* Canvas area */}
      <div
        ref={containerRef!}
        class="flex-1 h-full overflow-hidden"
      />

      {/* Side panel */}
      <div class="w-[280px] shrink-0 border-l border-gray-700 bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div class="px-4 py-3 border-b border-gray-700">
          <h1 class="text-lg font-bold tracking-tight">Spike C: Pixi.js</h1>
          <p class="text-xs text-gray-400 mt-1">
            {rendererInfo() || "Initializing…"}
          </p>
          <p class="text-xs text-gray-400">
            FPS: <span class="font-mono text-green-400">{fps()}</span>
          </p>
        </div>

        {/* Controls */}
        <div class="px-4 py-3 border-b border-gray-700 flex gap-2">
          <button
            class="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-xs font-semibold transition-colors"
            onClick={() => handleSetColor("red")}
          >
            Set Red
          </button>
          <button
            class="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-xs font-semibold transition-colors"
            onClick={() => handleSetColor("blue")}
          >
            Set Blue
          </button>
          <button
            class="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-xs font-semibold transition-colors"
            onClick={() => handleSetColor("unset")}
          >
            Unset
          </button>
        </div>

        {/* Selected units */}
        <div class="flex-1 overflow-y-auto px-4 py-3">
          <h2 class="text-sm font-semibold mb-2 text-gray-300">
            Selected Units
            <Show when={selectedIds().size > 0}>
              <span class="ml-1 text-green-400">({selectedIds().size})</span>
            </Show>
          </h2>

          <Show
            when={selectedIds().size > 0}
            fallback={
              <p class="text-xs text-gray-500 italic">
                Click a unit to select. Shift+click for multi-select.
              </p>
            }
          >
            <div class="space-y-1.5">
              <For each={selectedUnits()}>
                {(u) => (
                  <div class="flex items-center gap-2 rounded bg-gray-800 px-2.5 py-1.5 text-xs">
                    <div
                      class="w-3 h-3 rounded-full shrink-0"
                      style={{
                        background:
                          u.color === "red"
                            ? "#dd3333"
                            : u.color === "blue"
                              ? "#3366dd"
                              : "#888888",
                      }}
                    />
                    <span class="font-mono font-semibold">#{u.id}</span>
                    <span class="text-gray-400 ml-auto">
                      {Math.round(u.x)}, {Math.round(u.y)}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Footer */}
        <div class="px-4 py-2 border-t border-gray-700 text-[10px] text-gray-500">
          Scroll to zoom · Drag background to pan · Drag units to move
        </div>
      </div>
    </div>
  );
}
