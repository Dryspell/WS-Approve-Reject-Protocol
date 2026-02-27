import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import {
  loadModel,
  preloadModels,
  ASSETS,
  type CharacterClass,
} from "./asset-loader";

// ── Types ──────────────────────────────────────────────────────────────

export interface ManagedCharacter {
  id: string;
  mesh: THREE.Group;
  mixer: THREE.AnimationMixer;
  idleAction?: THREE.AnimationAction;
  walkAction?: THREE.AnimationAction;
  isMoving: boolean;
  nameSprite?: THREE.Sprite;
}

export interface SharedAnimations {
  idle?: THREE.AnimationClip;
  walk?: THREE.AnimationClip;
  run?: THREE.AnimationClip;
  interact?: THREE.AnimationClip;
}

// ── Dimension helpers ──────────────────────────────────────────────────

/**
 * Wait for a container to have non-trivial dimensions.
 * Defers two animation frames, then polls up to `timeoutMs`.
 * Returns `null` if the container disconnects or never gets dimensions.
 */
export async function waitForDimensions(
  container: HTMLElement,
  timeoutMs = 2000,
): Promise<{ w: number; h: number } | null> {
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

  if (!container.isConnected) return null;

  let w = container.clientWidth;
  let h = container.clientHeight;

  if (w > 2 && h > 2) return { w, h };

  const pollInterval = 100;
  const maxAttempts = Math.ceil(timeoutMs / pollInterval);
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, pollInterval));
    if (!container.isConnected) return null;
    w = container.clientWidth;
    h = container.clientHeight;
    if (w > 2 && h > 2) break;
  }

  return { w: Math.max(w, 1), h: Math.max(h, 1) };
}

// ── Name sprite ────────────────────────────────────────────────────────

export function createNameSprite(
  name: string,
  opts: { ready?: boolean; bgColor?: string } = {},
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);

  const bg =
    opts.bgColor ??
    (opts.ready ? "rgba(34,197,94,0.7)" : "rgba(0,0,0,0.6)");
  ctx.font = "bold 24px sans-serif";
  const measured = ctx.measureText(name).width + 20;
  const rectW = Math.min(measured, 240);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect((256 - rectW) / 2, 8, rectW, 40, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 128, 28, 230);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 1, 1);
  sprite.position.set(0, 3.2, 0);
  return sprite;
}

export function disposeNameSprite(sprite: THREE.Sprite) {
  (sprite.material as THREE.SpriteMaterial).map?.dispose();
  (sprite.material as THREE.SpriteMaterial).dispose();
}

// ── Trade billboard sprite ──────────────────────────────────────────────

export interface TradeBillboardData {
  offerId: number;
  type: "sell" | "buy" | "guarantee";
  price: number;
  color?: "red" | "blue" | null;
}

export function createTradeBillboard(data: TradeBillboardData): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 96);

  const bgColor =
    data.type === "sell"
      ? "rgba(234, 179, 8, 0.85)"
      : data.type === "buy"
        ? "rgba(59, 130, 246, 0.85)"
        : "rgba(168, 85, 247, 0.85)";

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(16, 8, 224, 72, 12);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(16, 8, 224, 72, 12);
  ctx.stroke();

  const icon = data.type === "sell" ? "↗" : data.type === "buy" ? "↙" : "🛡";
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, 28, 32);

  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`$${data.price.toFixed(2)}`, 128, 32);

  const label = data.type === "sell" ? "SELL" : data.type === "buy" ? "BUY" : "GUARANTEE";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(label, 128, 56);

  if (data.color) {
    ctx.fillStyle = data.color === "red" ? "#ef4444" : "#3b82f6";
    ctx.beginPath();
    ctx.arc(218, 32, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 1.5, 1);
  sprite.position.set(0, 4.2, 0);
  sprite.userData.offerId = data.offerId;
  sprite.userData.billboardAge = 0;
  return sprite;
}

export function disposeTradeBillboard(sprite: THREE.Sprite) {
  (sprite.material as THREE.SpriteMaterial).map?.dispose();
  (sprite.material as THREE.SpriteMaterial).dispose();
}

// ── Label sprite (for buildings) ───────────────────────────────────────

export function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 20px sans-serif";
  const w = ctx.measureText(text).width + 24;
  ctx.beginPath();
  ctx.roundRect((256 - w) / 2, 12, w, 36, 6);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 30, 230);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(5, 1.25, 1);
  sprite.position.set(0, 5, 0);
  return sprite;
}

// ── Shared animation loading ───────────────────────────────────────────

export async function loadSharedAnimations(): Promise<SharedAnimations> {
  const anims: SharedAnimations = {};

  for (const animPath of [ASSETS.animations.general, ASSETS.animations.movement]) {
    try {
      const { animations: clips } = await loadModel(animPath);
      for (const clip of clips) {
        const n = clip.name.toLowerCase();
        if (!anims.idle && (n.includes("idle") || n.includes("rest")))
          anims.idle = clip;
        if (!anims.walk && (n.includes("walk") || n.includes("run")))
          anims.walk = clip;
        if (!anims.run && n.includes("run")) anims.run = clip;
        if (!anims.interact && n.includes("interact"))
          anims.interact = clip;
      }
    } catch {
      /* proceed without this rig */
    }
  }

  return anims;
}

// ── Character spawning ─────────────────────────────────────────────────

export function setupAnimationActions(
  mixer: THREE.AnimationMixer,
  modelClips: THREE.AnimationClip[],
  shared: SharedAnimations,
): { idle?: THREE.AnimationAction; walk?: THREE.AnimationAction } {
  const allClips = [
    ...modelClips,
    ...(shared.idle ? [shared.idle] : []),
    ...(shared.walk ? [shared.walk] : []),
  ];

  let idle: THREE.AnimationAction | undefined;
  let walk: THREE.AnimationAction | undefined;

  for (const clip of allClips) {
    const n = clip.name.toLowerCase();
    if (!idle && (n.includes("idle") || n.includes("rest")))
      idle = mixer.clipAction(clip);
    if (!walk && (n.includes("walk") || n.includes("run")))
      walk = mixer.clipAction(clip);
  }

  if (!idle && allClips.length > 0) idle = mixer.clipAction(allClips[0]);

  return { idle, walk };
}

export async function spawnCharacter(
  charClass: CharacterClass,
  name: string,
  position: THREE.Vector3,
  shared: SharedAnimations,
  opts: { ready?: boolean; scale?: number } = {},
): Promise<ManagedCharacter> {
  const assetPath = ASSETS.characters[charClass];
  const { scene: model, animations } = await loadModel(assetPath);
  model.scale.setScalar(opts.scale ?? 1.6);

  const group = new THREE.Group();
  group.add(model);
  group.position.copy(position);

  const nameSprite = createNameSprite(name, { ready: opts.ready });
  group.add(nameSprite);

  const mixer = new THREE.AnimationMixer(model);
  const { idle, walk } = setupAnimationActions(mixer, animations, shared);
  idle?.play();

  return {
    id: name,
    mesh: group,
    mixer,
    idleAction: idle,
    walkAction: walk,
    isMoving: false,
    nameSprite,
  };
}

// ── Movement transition helper ─────────────────────────────────────────

export function transitionMovement(
  char: ManagedCharacter,
  moving: boolean,
  fadeTime = 0.2,
) {
  if (moving === char.isMoving) return;
  char.isMoving = moving;
  if (moving && char.walkAction) {
    char.walkAction.reset().fadeIn(fadeTime).play();
    char.idleAction?.fadeOut(fadeTime);
  } else if (!moving && char.idleAction) {
    char.idleAction.reset().fadeIn(fadeTime).play();
    char.walkAction?.fadeOut(fadeTime);
  }
}

// ── WebGL renderer factory ─────────────────────────────────────────────

export interface RendererSetup {
  renderer: THREE.WebGLRenderer;
  onContextLost: () => void;
  onContextRestored: () => void;
}

export function createRenderer(
  w: number,
  h: number,
  opts: {
    toneMapping?: THREE.ToneMapping;
    toneMappingExposure?: number;
  } = {},
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = opts.toneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.toneMappingExposure ?? 1.4;
  return renderer;
}

// ── Scene disposal ─────────────────────────────────────────────────────

export function disposeScene(scene: THREE.Scene) {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      materials.forEach((m) => m?.dispose?.());
    }
  });
}

// ── Procedural ground textures ─────────────────────────────────────────

export function createGrassTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#2e4a1e";
  ctx.fillRect(0, 0, size, size);

  for (let layer = 0; layer < 3; layer++) {
    const count = [4000, 2000, 800][layer];
    const maxR = [3, 6, 10][layer];
    const alpha = [0.08, 0.06, 0.04][layer];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * maxR + 1;
      const hue = 80 + Math.random() * 40;
      const sat = 30 + Math.random() * 40;
      const light = 18 + Math.random() * 16;
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha + Math.random() * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = "multiply";
  const pathColor = "rgba(90, 75, 50, 0.15)";
  const drawPath = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    const cx = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
    const cy = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  };
  const c = size / 2;
  drawPath(c, c, c, 0, 28);
  drawPath(c, c, c, size, 28);
  drawPath(c, c, 0, c, 22);
  drawPath(c, c, size, c, 22);
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEarthTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Build a noise-driven terrain zone map at pixel level
  const noise2D = createNoise2D();
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = (px / size) * 5.5;
      const ny = (py / size) * 5.5;

      // Multi-octave noise for smooth biome zones
      const zone =
        noise2D(nx * 1.0, ny * 1.0) * 0.55 +
        noise2D(nx * 2.3, ny * 2.3) * 0.28 +
        noise2D(nx * 5.1, ny * 5.1) * 0.12 +
        noise2D(nx * 11, ny * 11) * 0.05;

      // Fine pixel-level noise for micro-detail (simulates texture grain)
      const grain = (Math.random() - 0.5) * 18;

      let r: number, g: number, b: number;
      if (zone < -0.28) {
        // Lush grass — saturated mid-greens
        r = 46 + grain * 0.6;  g = 78 + grain * 0.4;  b = 34 + grain * 0.3;
      } else if (zone < -0.04) {
        // Earthy grass — olive/dry greens blending into dirt
        const t = (zone + 0.28) / 0.24;
        r = 46 + t * 28 + grain * 0.6;  g = 78 - t * 16 + grain * 0.4;  b = 34 - t * 4 + grain * 0.3;
      } else if (zone < 0.22) {
        // Packed dirt / earth
        r = 82 + grain * 0.7;  g = 64 + grain * 0.6;  b = 42 + grain * 0.5;
      } else if (zone < 0.42) {
        // Sandy / pale dust
        r = 112 + grain * 0.6;  g = 96 + grain * 0.5;  b = 68 + grain * 0.4;
      } else {
        // Rocky / stone — cool grey
        r = 105 + grain * 0.5;  g = 100 + grain * 0.5;  b = 90 + grain * 0.5;
      }

      const i = (py * size + px) * 4;
      d[i]     = Math.max(0, Math.min(255, Math.round(r)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Scatter fine surface pebble dots for depth
  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3.5;
    ctx.globalAlpha = 0.05 + Math.random() * 0.09;
    ctx.fillStyle = Math.random() > 0.6 ? "#1a150a" : "#3a3020";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Worn dirt paths from center toward corners and edges
  const drawPath = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    ctx.strokeStyle = "rgba(70, 52, 28, 0.22)";
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    const cx = (x1 + x2) / 2 + (Math.random() - 0.5) * 60;
    const cy = (y1 + y2) / 2 + (Math.random() - 0.5) * 60;
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  };
  const c = size / 2;
  drawPath(c, c, 0, 0, 22);
  drawPath(c, c, size, 0, 20);
  drawPath(c, c, 0, size, 20);
  drawPath(c, c, size, size, 22);
  drawPath(c, c, c, 0, 16);
  drawPath(c, c, c, size, 16);
  drawPath(c, c, 0, c, 14);
  drawPath(c, c, size, c, 14);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}
