import { createSignal, onMount, onCleanup, For, Show } from "solid-js";

// ── Types ──────────────────────────────────────────────────────────────

interface SceneNode {
  id: string;
  type: "unit" | "resource" | "building";
  x: number;
  y: number;
  tx: number; // spring target x
  ty: number; // spring target y
  vx: number; // spring velocity x
  vy: number; // spring velocity y
  w: number;
  h: number;
  color: string;
  label?: string;
  shape: "circle" | "diamond" | "rect";
  selected: boolean;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const WORLD_W = 1200;
const WORLD_H = 800;
const UNIT_RADIUS = 14;
const PANEL_W = 280;
const SPRING_STIFFNESS = 120;
const SPRING_DAMPING = 2 * Math.sqrt(SPRING_STIFFNESS); // critically damped
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_SAMPLES = 5;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

const RESOURCE_COLORS: Record<string, string> = {
  wood: "#8B4513",
  stone: "#808080",
  food: "#FF8C00",
  metal: "#C0C0C0",
  gems: "#9B30FF",
};

// ── Helpers ────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

function makeUnits(count: number): SceneNode[] {
  return Array.from({ length: count }, (_, i) => {
    const x = rand(UNIT_RADIUS + 40, WORLD_W - UNIT_RADIUS - 40);
    const y = rand(UNIT_RADIUS + 40, WORLD_H - UNIT_RADIUS - 40);
    return {
      id: `u${i}`,
      type: "unit",
      x, y, tx: x, ty: y, vx: 0, vy: 0,
      w: UNIT_RADIUS * 2,
      h: UNIT_RADIUS * 2,
      color: "#999",
      shape: "circle",
      selected: false,
    } satisfies SceneNode;
  });
}

function makeResources(): SceneNode[] {
  const types = ["wood", "stone", "food", "metal", "gems"];
  return types.map((t, i) => {
    const x = rand(100, WORLD_W - 100);
    const y = rand(100, WORLD_H - 100);
    return {
      id: `r-${t}`,
      type: "resource",
      x, y, tx: x, ty: y, vx: 0, vy: 0,
      w: 26, h: 26,
      color: RESOURCE_COLORS[t],
      label: t,
      shape: "diamond",
      selected: false,
    } satisfies SceneNode;
  });
}

function makeStorage(): SceneNode {
  const x = WORLD_W / 2;
  const y = WORLD_H / 2;
  return {
    id: "storage",
    type: "building",
    x, y, tx: x, ty: y, vx: 0, vy: 0,
    w: 80, h: 56,
    color: "#666",
    label: "Storage",
    shape: "rect",
    selected: false,
  };
}

function pointInCircle(px: number, py: number, cx: number, cy: number, r: number) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number) {
  return px >= rx - rw / 2 && px <= rx + rw / 2 && py >= ry - rh / 2 && py <= ry + rh / 2;
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Component ──────────────────────────────────────────────────────────

export default function CanvasSpike() {
  let canvasRef!: HTMLCanvasElement;
  let rafId = 0;

  const scene: SceneNode[] = [...makeUnits(20), ...makeResources(), makeStorage()];
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [fps, setFps] = createSignal(0);
  const [unitCount] = createSignal(scene.filter(n => n.type === "unit").length);

  const selectedUnits = () =>
    scene.filter(n => n.type === "unit" && selectedIds().includes(n.id));

  // ── Viewport ─────────────────────────────────────────────────────────

  const viewport: Viewport = { x: 0, y: 0, zoom: 1 };

  function screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - viewport.x) / viewport.zoom, (sy - viewport.y) / viewport.zoom];
  }

  // ── Interaction state ────────────────────────────────────────────────

  let isPanning = false;
  let isDragging = false;
  let isBoxSelecting = false;
  let panVelX = 0;
  let panVelY = 0;
  let hasMomentum = false;
  const panDeltas: { dx: number; dy: number; t: number }[] = [];
  let lastPointer = { x: 0, y: 0 };
  let dragStartWorld = { x: 0, y: 0 };
  let boxStart = { x: 0, y: 0 };
  let boxEnd = { x: 0, y: 0 };
  let dragOffsets: Map<string, { dx: number; dy: number }> = new Map();

  // ── Drawing helpers ──────────────────────────────────────────────────

  function drawCircle(ctx: CanvasRenderingContext2D, n: SceneNode) {
    const r = n.w / 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (n.selected) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#00FF66";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  function drawDiamond(ctx: CanvasRenderingContext2D, n: SceneNode) {
    const hw = n.w / 2;
    const hh = n.h / 2;
    ctx.beginPath();
    ctx.moveTo(n.x, n.y - hh);
    ctx.lineTo(n.x + hw, n.y);
    ctx.lineTo(n.x, n.y + hh);
    ctx.lineTo(n.x - hw, n.y);
    ctx.closePath();
    ctx.fillStyle = n.color;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (n.label) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(n.label, n.x, n.y + hh + 4);
    }
  }

  function drawRect(ctx: CanvasRenderingContext2D, n: SceneNode) {
    ctx.fillStyle = n.color;
    ctx.fillRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.strokeRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);

    if (n.label) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, n.y);
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const step = 50;
    for (let gx = 0; gx <= WORLD_W; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, WORLD_H);
      ctx.stroke();
    }
    for (let gy = 0; gy <= WORLD_H; gy += step) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(WORLD_W, gy);
      ctx.stroke();
    }
  }

  function drawBoxSelection(ctx: CanvasRenderingContext2D) {
    if (!isBoxSelecting) return;
    const [wx1, wy1] = screenToWorld(boxStart.x, boxStart.y);
    const [wx2, wy2] = screenToWorld(boxEnd.x, boxEnd.y);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#00FF66";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wx1, wy1, wx2 - wx1, wy2 - wy1);
    ctx.fillStyle = "rgba(0, 255, 102, 0.08)";
    ctx.fillRect(wx1, wy1, wx2 - wx1, wy2 - wy1);
    ctx.setLineDash([]);
  }

  // ── Hit testing ──────────────────────────────────────────────────────

  function hitTest(wx: number, wy: number): SceneNode | null {
    for (let i = scene.length - 1; i >= 0; i--) {
      const n = scene[i];
      if (n.type === "unit" && pointInCircle(wx, wy, n.x, n.y, n.w / 2)) return n;
      if (n.type === "building" && pointInRect(wx, wy, n.x, n.y, n.w, n.h)) return n;
    }
    return null;
  }

  // ── Sync selection signal ────────────────────────────────────────────

  function syncSelection() {
    setSelectedIds(scene.filter(n => n.selected).map(n => n.id));
  }

  function clearSelection() {
    for (const n of scene) n.selected = false;
  }

  // ── Pointer handlers ────────────────────────────────────────────────

  function onPointerDown(e: PointerEvent) {
    const rect = canvasRef.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    lastPointer = { x: sx, y: sy };

    // Right or middle button → pan
    if (e.button === 1 || e.button === 2) {
      isPanning = true;
      hasMomentum = false;
      panDeltas.length = 0;
      canvasRef.setPointerCapture(e.pointerId);
      return;
    }

    const [wx, wy] = screenToWorld(sx, sy);
    const hit = hitTest(wx, wy);

    if (hit && hit.type === "unit") {
      if (e.shiftKey) {
        hit.selected = !hit.selected;
      } else if (!hit.selected) {
        clearSelection();
        hit.selected = true;
      }
      syncSelection();

      // Start dragging selected units
      isDragging = true;
      dragStartWorld = { x: wx, y: wy };
      dragOffsets = new Map();
      for (const n of scene) {
        if (n.selected) dragOffsets.set(n.id, { dx: n.tx - wx, dy: n.ty - wy });
      }
      canvasRef.setPointerCapture(e.pointerId);
      return;
    }

    // Empty area → box select
    if (!e.shiftKey) clearSelection();
    isBoxSelecting = true;
    boxStart = { x: sx, y: sy };
    boxEnd = { x: sx, y: sy };
    canvasRef.setPointerCapture(e.pointerId);
    syncSelection();
  }

  function onPointerMove(e: PointerEvent) {
    const rect = canvasRef.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const dx = sx - lastPointer.x;
    const dy = sy - lastPointer.y;

    if (isPanning) {
      viewport.x += dx;
      viewport.y += dy;
      panDeltas.push({ dx, dy, t: performance.now() });
      if (panDeltas.length > MOMENTUM_SAMPLES) panDeltas.shift();
      canvasRef.style.cursor = "grab";
    } else if (isDragging) {
      const [wx, wy] = screenToWorld(sx, sy);
      for (const n of scene) {
        if (!n.selected) continue;
        const off = dragOffsets.get(n.id);
        if (off) {
          n.tx = wx + off.dx;
          n.ty = wy + off.dy;
        }
      }
      canvasRef.style.cursor = "grabbing";
    } else if (isBoxSelecting) {
      boxEnd = { x: sx, y: sy };
      canvasRef.style.cursor = "crosshair";

      const [wx1, wy1] = screenToWorld(boxStart.x, boxStart.y);
      const [wx2, wy2] = screenToWorld(boxEnd.x, boxEnd.y);
      const bx = Math.min(wx1, wx2);
      const by = Math.min(wy1, wy2);
      const bw = Math.abs(wx2 - wx1);
      const bh = Math.abs(wy2 - wy1);

      for (const n of scene) {
        if (n.type !== "unit") continue;
        n.selected = rectsOverlap(
          bx, by, bw, bh,
          n.x - n.w / 2, n.y - n.h / 2, n.w, n.h,
        );
      }
      syncSelection();
    } else {
      const [wx, wy] = screenToWorld(sx, sy);
      const over = hitTest(wx, wy);
      canvasRef.style.cursor = over?.type === "unit" ? "pointer" : "default";
    }

    lastPointer = { x: sx, y: sy };
  }

  function onPointerUp(e: PointerEvent) {
    if (isPanning) {
      // Compute momentum from recent deltas
      const now = performance.now();
      const recent = panDeltas.filter(d => now - d.t < 100);
      if (recent.length > 0) {
        panVelX = recent.reduce((s, d) => s + d.dx, 0) / recent.length;
        panVelY = recent.reduce((s, d) => s + d.dy, 0) / recent.length;
        hasMomentum = Math.abs(panVelX) + Math.abs(panVelY) > 1;
      }
    }

    isPanning = false;
    isDragging = false;
    isBoxSelecting = false;
    canvasRef.releasePointerCapture(e.pointerId);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = canvasRef.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * factor));
    const scale = newZoom / viewport.zoom;

    // Focal-point zoom: keep the world point under cursor fixed
    viewport.x = sx - (sx - viewport.x) * scale;
    viewport.y = sy - (sy - viewport.y) * scale;
    viewport.zoom = newZoom;
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  // ── Game loop ────────────────────────────────────────────────────────

  function update(dt: number) {
    // Spring physics for units
    for (const n of scene) {
      if (n.type !== "unit") continue;
      const ex = n.tx - n.x;
      const ey = n.ty - n.y;
      const ax = SPRING_STIFFNESS * ex - SPRING_DAMPING * n.vx;
      const ay = SPRING_STIFFNESS * ey - SPRING_DAMPING * n.vy;
      n.vx += ax * dt;
      n.vy += ay * dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;

      if (Math.abs(ex) < 0.01 && Math.abs(ey) < 0.01 && Math.abs(n.vx) < 0.01) {
        n.x = n.tx;
        n.y = n.ty;
        n.vx = 0;
        n.vy = 0;
      }
    }

    // Pan momentum
    if (hasMomentum) {
      viewport.x += panVelX;
      viewport.y += panVelY;
      panVelX *= MOMENTUM_FRICTION;
      panVelY *= MOMENTUM_FRICTION;
      if (Math.abs(panVelX) + Math.abs(panVelY) < 0.1) hasMomentum = false;
    }
  }

  function render(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // World boundary
    ctx.fillStyle = "#16213e";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

    drawGrid(ctx);

    // Draw scene nodes back-to-front: buildings → resources → units
    for (const n of scene) {
      if (n.shape === "rect") drawRect(ctx, n);
    }
    for (const n of scene) {
      if (n.shape === "diamond") drawDiamond(ctx, n);
    }
    for (const n of scene) {
      if (n.shape === "circle") drawCircle(ctx, n);
    }

    drawBoxSelection(ctx);
    ctx.restore();
  }

  // ── Mount ────────────────────────────────────────────────────────────

  onMount(() => {
    const ctx = canvasRef.getContext("2d")!;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvasRef.parentElement!;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvasRef.width = w * dpr;
      canvasRef.height = h * dpr;
      canvasRef.style.width = `${w}px`;
      canvasRef.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Center the world in the viewport initially
    const parent = canvasRef.parentElement!;
    viewport.x = (parent.clientWidth - WORLD_W) / 2;
    viewport.y = (parent.clientHeight - WORLD_H) / 2;

    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 1) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = 0;
      }

      update(dt);
      render(ctx, canvasRef.parentElement!.clientWidth, canvasRef.parentElement!.clientHeight);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    canvasRef.addEventListener("pointerdown", onPointerDown);
    canvasRef.addEventListener("pointermove", onPointerMove);
    canvasRef.addEventListener("pointerup", onPointerUp);
    canvasRef.addEventListener("wheel", onWheel, { passive: false });
    canvasRef.addEventListener("contextmenu", onContextMenu);

    onCleanup(() => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeCanvas);
      canvasRef.removeEventListener("pointerdown", onPointerDown);
      canvasRef.removeEventListener("pointermove", onPointerMove);
      canvasRef.removeEventListener("pointerup", onPointerUp);
      canvasRef.removeEventListener("wheel", onWheel);
      canvasRef.removeEventListener("contextmenu", onContextMenu);
    });
  });

  // ── Panel actions ────────────────────────────────────────────────────

  function setColor(color: string) {
    for (const n of scene) {
      if (n.selected && n.type === "unit") n.color = color;
    }
  }

  // ── JSX ──────────────────────────────────────────────────────────────

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-gray-950">
      {/* Canvas area */}
      <div class="flex-1 relative">
        <canvas ref={canvasRef} class="absolute inset-0" />
      </div>

      {/* Side panel */}
      <div
        class="flex flex-col border-l border-gray-700 bg-gray-900 text-gray-100 overflow-y-auto"
        style={{ width: `${PANEL_W}px`, "min-width": `${PANEL_W}px` }}
      >
        {/* Header */}
        <div class="px-4 py-3 border-b border-gray-700">
          <h1 class="text-lg font-bold tracking-tight">Spike A: Canvas</h1>
          <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>Units: {unitCount()}</span>
            <span>FPS: {fps()}</span>
          </div>
        </div>

        {/* Selection actions */}
        <div class="px-4 py-3 border-b border-gray-700">
          <div class="flex gap-2">
            <button
              class="flex-1 rounded bg-red-600 hover:bg-red-500 px-2 py-1.5 text-xs font-semibold transition"
              onClick={() => setColor("#e74c3c")}
            >
              Set Red
            </button>
            <button
              class="flex-1 rounded bg-blue-600 hover:bg-blue-500 px-2 py-1.5 text-xs font-semibold transition"
              onClick={() => setColor("#3498db")}
            >
              Set Blue
            </button>
            <button
              class="flex-1 rounded bg-gray-600 hover:bg-gray-500 px-2 py-1.5 text-xs font-semibold transition"
              onClick={() => setColor("#999")}
            >
              Unset
            </button>
          </div>
        </div>

        {/* Selected units list */}
        <div class="flex-1 px-4 py-3 overflow-y-auto">
          <Show
            when={selectedIds().length > 0}
            fallback={
              <p class="text-xs text-gray-500 italic">No units selected. Click or box-select units on the canvas.</p>
            }
          >
            <p class="text-xs text-gray-400 mb-2">
              {selectedIds().length} unit{selectedIds().length !== 1 ? "s" : ""} selected
            </p>
            <ul class="space-y-1">
              <For each={selectedUnits()}>
                {(unit) => (
                  <li class="flex items-center gap-2 rounded bg-gray-800 px-2 py-1.5 text-xs">
                    <span
                      class="inline-block w-3 h-3 rounded-full shrink-0 border border-gray-600"
                      style={{ "background-color": unit.color }}
                    />
                    <span class="font-mono font-semibold">{unit.id}</span>
                    <span class="text-gray-400 ml-auto">
                      ({Math.round(unit.x)}, {Math.round(unit.y)})
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        {/* Footer hints */}
        <div class="px-4 py-2 border-t border-gray-700 text-[10px] text-gray-500 leading-relaxed">
          <p>Click: select &middot; Shift+click: multi</p>
          <p>Drag: move selected &middot; Box: area select</p>
          <p>Right/middle drag: pan &middot; Scroll: zoom</p>
        </div>
      </div>
    </div>
  );
}
