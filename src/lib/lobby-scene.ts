import * as THREE from "three";
import {
  loadModel,
  preloadModels,
  disposeModel,
  onLoadProgress,
  ASSETS,
  type CharacterClass,
} from "./asset-loader";
import {
  type ManagedCharacter,
  type SharedAnimations,
  waitForDimensions,
  createNameSprite,
  disposeNameSprite,
  createLabelSprite,
  loadSharedAnimations,
  spawnCharacter,
  transitionMovement,
  createRenderer,
  createGrassTexture,
  disposeScene,
} from "./three-utils";

// ── Public types ───────────────────────────────────────────────────────

export interface LobbyPlayer {
  id: string;
  name: string;
  character: CharacterClass;
  x: number;
  z: number;
  isReady: boolean;
  isMoving?: boolean;
}

export interface LobbySceneCallbacks {
  onBuildingInteract?: (buildingId: string | null) => void;
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
  onLoadProgress?: (progress: number) => void;
}

// ── Constants ──────────────────────────────────────────────────────────

const LOBBY_SIZE = 50;
const CHARACTER_SCALE = 1.6;
const MOVE_SPEED = 10;
const CAMERA_OFFSET = new THREE.Vector3(0, 30, 24);
const CAMERA_LERP = 0.06;
const POSITION_BROADCAST_INTERVAL = 0.1;

interface BuildingDef {
  id: string;
  name: string;
  position: THREE.Vector3;
  triggerRadius: number;
  assets: string[];
  scale: number;
  isNear: boolean;
}

const BUILDING_DEFS: Omit<BuildingDef, "isNear">[] = [
  {
    id: "armory",
    name: "Armory",
    position: new THREE.Vector3(-12, 0, -10),
    triggerRadius: 6,
    assets: [
      ASSETS.structures.chest_gold,
      ASSETS.structures.banner_red,
      ASSETS.structures.candle,
      ASSETS.structures.coins_large,
    ],
    scale: 2.2,
  },
  {
    id: "barracks",
    name: "Barracks",
    position: new THREE.Vector3(12, 0, -10),
    triggerRadius: 6,
    assets: [
      ASSETS.structures.banner_blue,
      ASSETS.structures.box_large,
      ASSETS.structures.box_small,
      ASSETS.structures.column,
    ],
    scale: 2.2,
  },
  {
    id: "tavern",
    name: "Tavern",
    position: new THREE.Vector3(0, 0, 14),
    triggerRadius: 6,
    assets: [
      ASSETS.structures.barrel_decorated,
      ASSETS.structures.barrel,
      ASSETS.structures.chair,
      ASSETS.structures.candle,
    ],
    scale: 2.2,
  },
];

// ── Nature prop scattering ─────────────────────────────────────────────

async function scatterNatureProps(scene: THREE.Scene, lobbySize: number) {
  const half = lobbySize / 2;
  const envAssets = [
    { path: ASSETS.environment.bush_1a, count: 8, scale: [1.5, 2.5], ring: [0.7, 0.95] },
    { path: ASSETS.environment.bush_2a, count: 6, scale: [1.2, 2.0], ring: [0.65, 0.9] },
    { path: ASSETS.environment.rock_1a, count: 10, scale: [1.0, 2.0], ring: [0.5, 0.95] },
    { path: ASSETS.environment.rock_1b, count: 6, scale: [0.8, 1.5], ring: [0.6, 0.9] },
    { path: ASSETS.environment.grass_1a, count: 15, scale: [1.0, 2.0], ring: [0.3, 0.95] },
    { path: ASSETS.environment.grass_1b, count: 12, scale: [0.8, 1.8], ring: [0.4, 0.9] },
  ];

  for (const def of envAssets) {
    try {
      const { scene: model } = await loadModel(def.path);
      for (let i = 0; i < def.count; i++) {
        const clone = model.clone();
        const angle = Math.random() * Math.PI * 2;
        const radius = half * (def.ring[0] + Math.random() * (def.ring[1] - def.ring[0]));
        clone.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        clone.rotation.y = Math.random() * Math.PI * 2;
        const s = def.scale[0] + Math.random() * (def.scale[1] - def.scale[0]);
        clone.scale.setScalar(s);
        scene.add(clone);
      }
    } catch {
      /* asset not available */
    }
  }
}

// ── LobbySceneManager ─────────────────────────────────────────────────

export class LobbySceneManager {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private timer!: THREE.Timer;

  private animationId = 0;
  private disposed = false;
  private ro?: ResizeObserver;

  private keys: Record<string, boolean> = {};
  private keydownHandler?: (e: KeyboardEvent) => void;
  private keyupHandler?: (e: KeyboardEvent) => void;

  private playerChar: ManagedCharacter | null = null;
  private otherChars = new Map<string, ManagedCharacter>();
  private otherPlayerTargets = new Map<string, { x: number; z: number; rotY: number; isMoving: boolean }>();
  private buildings: BuildingDef[];
  private buildingMeshes: THREE.Group[] = [];
  private sharedAnimations: SharedAnimations = {};

  private callbacks: LobbySceneCallbacks;
  private elapsed = 0;
  private lastPositionBroadcast = 0;

  constructor(container: HTMLElement, callbacks: LobbySceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.buildings = BUILDING_DEFS.map((b) => ({
      ...b,
      isNear: false,
      position: b.position.clone(),
    }));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  async init(playerName: string, playerCharacter: CharacterClass = "knight") {
    const dims = await waitForDimensions(this.container);
    if (!dims || this.disposed) return;
    const { w, h } = dims;

    this.buildScene(w, h);
    this.buildStaticGeometry();
    this.setupKeyboard();
    this.setupResizeObserver();
    this.startLoop();

    // Async asset loading runs in background; the scene is already visible
    // with ground, fences, and lights while models stream in.
    await this.loadAssets(playerName, playerCharacter);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.ro?.disconnect();

    if (this.keydownHandler) window.removeEventListener("keydown", this.keydownHandler);
    if (this.keyupHandler) window.removeEventListener("keyup", this.keyupHandler);

    if (this.playerChar) {
      this.playerChar.mixer.stopAllAction();
      disposeModel(this.playerChar.mesh);
    }
    for (const [, c] of this.otherChars) {
      c.mixer.stopAllAction();
      disposeModel(c.mesh);
    }
    for (const m of this.buildingMeshes) {
      disposeModel(m);
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      disposeScene(this.scene);
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }

  get isDisposed() {
    return this.disposed;
  }

  // ── Scene construction (synchronous) ────────────────────────────────

  private buildScene(w: number, h: number) {
    this.timer = new THREE.Timer();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2a15);
    this.scene.fog = new THREE.FogExp2(0x1a2a15, 0.018);

    this.camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 200);
    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(0, 0, 0);

    this.renderer = createRenderer(w, h, { toneMappingExposure: 1.4 });
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.disposed = true;
      cancelAnimationFrame(this.animationId);
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.disposed = false;
      this.startLoop();
    });
  }

  private buildStaticGeometry() {
    // Lighting
    this.scene.add(new THREE.AmbientLight(0xccd0b8, 0.35));
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a1e, 0.3));

    const sun = new THREE.DirectionalLight(0xffecd2, 1.4);
    sun.position.set(15, 35, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x99b3cc, 0.2);
    fill.position.set(-15, 10, -15);
    this.scene.add(fill);

    for (const b of this.buildings) {
      const light = new THREE.PointLight(0xff9944, 1.5, 18, 1.5);
      light.position.set(b.position.x, 3, b.position.z);
      this.scene.add(light);
    }

    const centerLight = new THREE.PointLight(0xffd699, 0.6, 20);
    centerLight.position.set(0, 4, 0);
    this.scene.add(centerLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(LOBBY_SIZE, LOBBY_SIZE);
    const groundTex = createGrassTexture();
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Fence posts
    const half = LOBBY_SIZE / 2;
    const fenceGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 6);
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5c4a32, roughness: 0.9 });
    for (let i = -half; i <= half; i += 4) {
      for (const pos of [
        [i, 0.6, -half], [i, 0.6, half],
        [-half, 0.6, i], [half, 0.6, i],
      ]) {
        const post = new THREE.Mesh(fenceGeo, fenceMat);
        post.position.set(pos[0], pos[1], pos[2]);
        post.castShadow = true;
        this.scene.add(post);
      }
    }

    // Scatter nature props (async, fire-and-forget)
    scatterNatureProps(this.scene, LOBBY_SIZE);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────

  private setupKeyboard() {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys[e.key.toLowerCase()] = true;
    };
    this.keyupHandler = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
  }

  // ── Resize ───────────────────────────────────────────────────────────

  private setupResizeObserver() {
    this.ro = new ResizeObserver(() => {
      if (this.disposed) return;
      const rw = this.container.clientWidth;
      const rh = this.container.clientHeight;
      if (rw === 0 || rh === 0) return;
      this.camera.aspect = rw / rh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rw, rh);
    });
    this.ro.observe(this.container);
  }

  // ── Animation loop ───────────────────────────────────────────────────

  private startLoop() {
    const animate = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(animate);
      this.timer.update();
      const dt = this.timer.getDelta();
      this.elapsed += dt;

      this.updatePlayerMovement(dt);
      this.updateOtherCharacters(dt);
      this.updateBuildingBob();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private updatePlayerMovement(dt: number) {
    if (!this.playerChar) return;

    const dx =
      (this.keys["d"] || this.keys["arrowright"] ? 1 : 0) -
      (this.keys["a"] || this.keys["arrowleft"] ? 1 : 0);
    const dz =
      (this.keys["s"] || this.keys["arrowdown"] ? 1 : 0) -
      (this.keys["w"] || this.keys["arrowup"] ? 1 : 0);
    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      const len = Math.sqrt(dx * dx + dz * dz);
      const nx = dx / len;
      const nz = dz / len;
      this.playerChar.mesh.position.x += nx * MOVE_SPEED * dt;
      this.playerChar.mesh.position.z += nz * MOVE_SPEED * dt;

      const hBound = LOBBY_SIZE / 2 - 1;
      this.playerChar.mesh.position.x = Math.max(-hBound, Math.min(hBound, this.playerChar.mesh.position.x));
      this.playerChar.mesh.position.z = Math.max(-hBound, Math.min(hBound, this.playerChar.mesh.position.z));

      this.playerChar.mesh.rotation.y = Math.atan2(nx, nz);
    }

    transitionMovement(this.playerChar, moving);

    this.lastPositionBroadcast += dt;
    if (this.lastPositionBroadcast >= POSITION_BROADCAST_INTERVAL && (moving || this.lastPositionBroadcast > 1.0)) {
      this.lastPositionBroadcast = 0;
      this.callbacks.onPositionUpdate?.(
        this.playerChar.mesh.position.x,
        this.playerChar.mesh.position.z,
        this.playerChar.mesh.rotation.y,
        moving,
      );
    }

    this.playerChar.mixer.update(dt);

    // Camera follow
    const targetCam = this.playerChar.mesh.position.clone().add(CAMERA_OFFSET);
    this.camera.position.lerp(targetCam, CAMERA_LERP);
    this.camera.lookAt(this.playerChar.mesh.position);

    // Building proximity check
    for (const b of this.buildings) {
      const dist = this.playerChar.mesh.position.distanceTo(b.position);
      const wasNear = b.isNear;
      b.isNear = dist < b.triggerRadius;
      if (b.isNear && !wasNear) {
        this.callbacks.onBuildingInteract?.(b.id);
      } else if (!b.isNear && wasNear) {
        const anyNear = this.buildings.some((bb) => bb.isNear);
        if (!anyNear) this.callbacks.onBuildingInteract?.(null);
      }
    }
  }

  private updateOtherCharacters(dt: number) {
    for (const [id, char] of this.otherChars) {
      const target = this.otherPlayerTargets.get(id);
      if (target) {
        const lerpSpeed = 8 * dt;
        char.mesh.position.x += (target.x - char.mesh.position.x) * lerpSpeed;
        char.mesh.position.z += (target.z - char.mesh.position.z) * lerpSpeed;
        char.mesh.rotation.y += (target.rotY - char.mesh.rotation.y) * lerpSpeed;
        transitionMovement(char, target.isMoving);
      }
      char.mixer.update(dt);
    }
  }

  private updateBuildingBob() {
    for (const m of this.buildingMeshes) {
      m.position.y = Math.sin(this.elapsed * 0.8 + m.position.x) * 0.05;
    }
  }

  // ── Asset loading (async, runs in background) ───────────────────────

  private async loadAssets(playerName: string, playerCharacter: CharacterClass) {
    onLoadProgress((loaded, total) =>
      this.callbacks.onLoadProgress?.(Math.round((loaded / Math.max(total, 1)) * 100)),
    );

    const assetsToPreload = [
      ASSETS.characters[playerCharacter],
      ASSETS.animations.general,
      ASSETS.animations.movement,
      ...BUILDING_DEFS.flatMap((b) => b.assets),
    ];
    await preloadModels(assetsToPreload);
    if (this.disposed) return;

    this.sharedAnimations = await loadSharedAnimations();
    if (this.disposed) return;

    this.playerChar = await spawnCharacter(
      playerCharacter,
      playerName,
      new THREE.Vector3(0, 0, 0),
      this.sharedAnimations,
      { scale: CHARACTER_SCALE },
    );
    this.scene.add(this.playerChar.mesh);
    if (this.disposed) return;

    await this.buildBuildings();
    if (this.disposed) return;

    this.callbacks.onLoadProgress?.(100);
  }

  private async buildBuildings() {
    for (const b of this.buildings) {
      const group = new THREE.Group();
      group.position.copy(b.position);

      const platformGeo = new THREE.CylinderGeometry(3.5, 4, 0.3, 8);
      const platformMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.85 });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = 0.15;
      platform.receiveShadow = true;
      group.add(platform);

      const radius = 1.8;
      for (let i = 0; i < b.assets.length; i++) {
        try {
          const { scene: model } = await loadModel(b.assets[i]);
          model.scale.setScalar(b.scale);
          const angle = (i / b.assets.length) * Math.PI * 2 - Math.PI / 2;
          model.position.set(Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius);
          model.rotation.y = -angle + Math.PI;
          model.castShadow = true;
          group.add(model);
        } catch {
          /* skip failed asset */
        }
      }

      group.add(createLabelSprite(b.name));
      this.scene.add(group);
      this.buildingMeshes.push(group);
    }
  }

  // ── Public API for reactive updates ──────────────────────────────────

  updateOtherPlayers(players: LobbyPlayer[]) {
    if (!this.playerChar) return;

    const existingIds = new Set(this.otherChars.keys());
    const newIds = new Set(players.map((p) => p.id));

    // Remove departed
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const c = this.otherChars.get(id)!;
        c.mixer.stopAllAction();
        disposeModel(c.mesh);
        this.scene.remove(c.mesh);
        this.otherChars.delete(id);
        this.otherPlayerTargets.delete(id);
      }
    }

    // Update / spawn
    for (const p of players) {
      this.otherPlayerTargets.set(p.id, {
        x: p.x,
        z: p.z,
        rotY: 0,
        isMoving: p.isMoving ?? false,
      });

      const existing = this.otherChars.get(p.id);
      if (existing) {
        if (existing.nameSprite) {
          existing.mesh.remove(existing.nameSprite);
          disposeNameSprite(existing.nameSprite);
          const newSprite = createNameSprite(p.name, { ready: p.isReady });
          existing.mesh.add(newSprite);
          existing.nameSprite = newSprite;
        }
      } else {
        spawnCharacter(
          p.character,
          p.name,
          new THREE.Vector3(p.x, 0, p.z),
          this.sharedAnimations,
          { ready: p.isReady, scale: CHARACTER_SCALE },
        )
          .then((char) => {
            char.id = p.id;
            this.scene.add(char.mesh);
            this.otherChars.set(p.id, char);
          })
          .catch(() => {});
      }
    }
  }
}
