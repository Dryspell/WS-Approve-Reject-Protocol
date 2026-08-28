import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  loadModel,
  preloadModels,
  disposeModel,
  onLoadProgress,
  ASSETS,
  characterForIndex,
  skeletonForIndex,
  resourceTypeToAsset,
  buildingTypeToAsset,
  type CharacterClass,
} from "./asset-loader";
import {
  type ManagedCharacter,
  type SharedAnimations,
  type TradeBillboardData,
  createNameSprite,
  createTradeBillboard,
  disposeTradeBillboard,
  setupAnimationActions,
  loadSharedAnimations,
  transitionMovement,
  createRenderer,
  createEarthTexture,
  disposeScene,
} from "./three-utils";

// ── Public types ───────────────────────────────────────────────────────

export type TeamColor = "red" | "blue" | "unset";

export interface ColonyUnit {
  id: number;
  team: TeamColor;
  x: number;
  z: number;
  ownerId?: string;
  characterClass?: CharacterClass;
  taskType?: string;
  targetX?: number;
  targetZ?: number;
  health?: number;
  maxHealth?: number;
}

export interface ColonyResource {
  id: string;
  type: string;
  x: number;
  z: number;
  amount: number;
  maxAmount: number;
}

export interface OtherPlayerAvatar {
  id: string;
  name: string;
  characterClass: CharacterClass;
  x: number;
  z: number;
  rotationY: number;
  isMoving: boolean;
}

export interface ActiveTradeOffer {
  unitId: number;
  offerId: number;
  type: "sell" | "buy" | "guarantee";
  price: number;
  color?: "red" | "blue" | null;
}

export interface ColonyBuilding {
  id: number;
  buildingType: string;
  x: number;
  z: number;
  constructionProgress?: number;
  constructionMax?: number;
}

export interface HoverFocus {
  unitId?: number;
  ownerId?: string;
}

export interface ColonySceneCallbacks {
  onSelect: (ids: number[]) => void;
  onMoveUnit?: (id: number, x: number, z: number) => void;
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
  onLoadProgress?: (progress: number) => void;
  onAssetsReady?: () => void;
  onTradeOfferClick?: (offerId: number, screenX: number, screenY: number) => void;
  onHoverUnit?: (id: number | null) => void;
  onHoverPlayer?: (id: string | null) => void;
  onWorldContextMenu?: (target: { unitId?: number; playerId?: string }, screenX: number, screenY: number) => void;
  getSelectedIds: () => number[];
}

// ── Constants ──────────────────────────────────────────────────────────

const TEAM_COLOR: Record<TeamColor, number> = { red: 0xd93025, blue: 0x1a73e8, unset: 0x80868b };
const GROUND_SIZE = 100;
const CHARACTER_SCALE = 1.4;
const AVATAR_MOVE_SPEED = 10;
const AVATAR_CAMERA_OFFSET = new THREE.Vector3(0, 35, 28);
const AVATAR_CAMERA_LERP = 0.06;
const AVATAR_BROADCAST_INTERVAL = 0.1;

// ── Spring physics ─────────────────────────────────────────────────────

interface Spring3 {
  cx: number; cy: number; cz: number;
  tx: number; ty: number; tz: number;
  vx: number; vy: number; vz: number;
}

function springUpdate(s: Spring3, dt: number, stiffness = 170, damping = 26) {
  const clampedDt = Math.min(dt, 0.033);
  for (const axis of ["x", "y", "z"] as const) {
    const c = `c${axis}` as keyof Spring3;
    const t = `t${axis}` as keyof Spring3;
    const v = `v${axis}` as keyof Spring3;
    const delta = (s[t] as number) - (s[c] as number);
    const accel = stiffness * delta - damping * (s[v] as number);
    (s as any)[v] += accel * clampedDt;
    (s as any)[c] += (s[v] as number) * clampedDt;
  }
}

function springSettled(s: Spring3, threshold = 0.01): boolean {
  return (
    Math.abs(s.tx - s.cx) < threshold &&
    Math.abs(s.ty - s.cy) < threshold &&
    Math.abs(s.tz - s.cz) < threshold &&
    Math.abs(s.vx) < threshold &&
    Math.abs(s.vy) < threshold &&
    Math.abs(s.vz) < threshold
  );
}

// ── Internal data structures ───────────────────────────────────────────

interface InternalUnit {
  id: number;
  team: TeamColor;
  ownerId?: string;
  characterClass: CharacterClass;
  mesh: THREE.Group;
  hitTarget: THREE.Mesh;
  ring?: THREE.Mesh;
  hoverRing?: THREE.Mesh;
  tradeBillboard?: THREE.Sprite;
  billboardAge: number;
  spring: Spring3;
  mixer?: THREE.AnimationMixer;
  idleAction?: THREE.AnimationAction;
  walkAction?: THREE.AnimationAction;
  gatherAction?: THREE.AnimationAction;
  craftAction?: THREE.AnimationAction;
  isMoving: boolean;
  taskType?: string;
  healthBar?: THREE.Group;
}

interface InternalResource {
  id: string;
  type: string;
  mesh: THREE.Group;
  amount: number;
  maxAmount: number;
}

interface InternalBuilding {
  id: number;
  buildingType: string;
  mesh: THREE.Group;
  progressBar?: THREE.Mesh;
}

// ── Mesh factories ─────────────────────────────────────────────────────

function createTeamRing(team: TeamColor): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.65, 0.85, 32);
  const mat = new THREE.MeshBasicMaterial({ color: TEAM_COLOR[team], transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

function createSelectionRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.9, 1.05, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

function createHoverRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.95, 1.15, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  return mesh;
}

function createHitTarget(): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 2.0, 8);
  const mat = new THREE.MeshBasicMaterial({ visible: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.0;
  return mesh;
}

function createHealthBar(health: number, maxHealth: number): THREE.Group {
  const group = new THREE.Group();
  const bgGeo = new THREE.PlaneGeometry(1.2, 0.12);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(bgGeo, bgMat));

  const ratio = Math.max(0, health / maxHealth);
  const fillGeo = new THREE.PlaneGeometry(1.16 * ratio, 0.08);
  const color = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfbbf24 : 0xef4444;
  const fillMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.x = (1.16 * (ratio - 1)) / 2;
  group.add(fill);

  group.position.y = 2.6;
  return group;
}

// ── ColonySceneManager ─────────────────────────────────────────────────

export class ColonySceneManager {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private timer!: THREE.Timer;

  private animationId = 0;
  private disposed = false;
  private ro?: ResizeObserver;
  private frustum = 28;

  private wasdKeys: Record<string, boolean> = {};
  private keydownHandler?: (e: KeyboardEvent) => void;
  private keyupHandler?: (e: KeyboardEvent) => void;

  private internalUnits: InternalUnit[] = [];
  private internalResources: InternalResource[] = [];
  private internalBuildings: InternalBuilding[] = [];
  private sharedAnimations: SharedAnimations = {};

  private playerAvatar: ManagedCharacter | null = null;
  private otherAvatars = new Map<string, ManagedCharacter>();
  private otherAvatarTargets = new Map<string, { x: number; z: number; rotY: number; isMoving: boolean }>();

  private isDragging = false;
  private dragUnit: InternalUnit | null = null;
  private dragOffset = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private callbacks: ColonySceneCallbacks;
  private elapsed = 0;
  private lastAvatarBroadcast = 0;
  private localPlayerId: string | null = null;
  private hoverFocus: HoverFocus | null = null;
  private ownershipLines: THREE.Line[] = [];
  private lastHoverUnitId: number | null = null;
  private lastHoverPlayerId: string | null = null;
  private suppressOrbit = false;

  constructor(container: HTMLElement, callbacks: ColonySceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  init(
    units: ColonyUnit[],
    resources: ColonyResource[] | undefined,
    playerName?: string,
    playerCharacter?: CharacterClass,
  ) {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.buildScene(w, h);
    this.buildStaticGeometry();
    this.setupControls();
    this.setupPointerEvents();
    this.setupKeyboard();
    this.setupResizeObserver();
    this.startLoop();

    this.loadAssets(units, resources, playerName, playerCharacter);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.ro?.disconnect();

    if (this.keydownHandler) window.removeEventListener("keydown", this.keydownHandler);
    if (this.keyupHandler) window.removeEventListener("keyup", this.keyupHandler);

    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener("pointerdown", this.handlePointerDown);
      canvas.removeEventListener("pointermove", this.handlePointerMove);
      canvas.removeEventListener("pointerup", this.handlePointerUp);
      canvas.removeEventListener("pointerleave", this.handlePointerLeave);
      canvas.removeEventListener("click", this.handleClick);
      canvas.removeEventListener("contextmenu", this.handleContextMenu);
      this.clearOwnershipLines();
    }
    this.controls?.dispose();

    if (this.playerAvatar) {
      this.playerAvatar.mixer.stopAllAction();
      disposeModel(this.playerAvatar.mesh);
    }
    for (const [, a] of this.otherAvatars) {
      a.mixer.stopAllAction();
      disposeModel(a.mesh);
    }
    for (const u of this.internalUnits) {
      u.mixer?.stopAllAction();
      disposeModel(u.mesh);
    }
    for (const r of this.internalResources) {
      disposeModel(r.mesh);
    }
    for (const b of this.internalBuildings) {
      disposeModel(b.mesh);
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

  // ── Scene construction ───────────────────────────────────────────────

  private buildScene(w: number, h: number) {
    this.timer = new THREE.Timer();
    this.scene = new THREE.Scene();
    // Warm dusk sky — matches the directional sun light colour
    this.scene.background = new THREE.Color(0x3a2e1c);
    this.scene.fog = new THREE.Fog(0x3a2e1c, 70, 130);

    const aspect = w / h;
    this.camera = new THREE.OrthographicCamera(
      (-this.frustum * aspect) / 2,
      (this.frustum * aspect) / 2,
      this.frustum / 2,
      -this.frustum / 2,
      0.1,
      500,
    );

    const tilt = THREE.MathUtils.degToRad(15);
    const camDist = 100;
    this.camera.position.set(0, camDist * Math.cos(tilt), camDist * Math.sin(tilt));
    this.camera.lookAt(0, 0, 0);

    this.renderer = createRenderer(w, h, { toneMappingExposure: 1.1 });
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const sun = new THREE.DirectionalLight(0xfff5e1, 1.4);
    sun.position.set(30, 55, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -65;
    sun.shadow.camera.right = 65;
    sun.shadow.camera.top = 65;
    sun.shadow.camera.bottom = -65;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb0c4de, 0.3);
    fill.position.set(-15, 20, -10);
    this.scene.add(fill);

    const warmLight = new THREE.PointLight(0xffaa44, 0.6, 35);
    warmLight.position.set(0, 3, 0);
    this.scene.add(warmLight);

    // ── Terrain with simplex-noise height displacement ───────────────
    const terrainNoise = createNoise2D();
    const segments = 56;
    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, segments, segments);

    const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);

      // Multi-octave noise: broad swells + medium rolls + fine bumps
      const height =
        terrainNoise(x * 0.035, y * 0.035) * 2.2 +
        terrainNoise(x * 0.085, y * 0.085) * 0.9 +
        terrainNoise(x * 0.18, y * 0.18) * 0.35;

      // Ease: flat within center radius, rising toward edges
      const distNorm = Math.sqrt(x * x + y * y) / (GROUND_SIZE * 0.5);
      const edgeFactor = Math.pow(Math.max(0, (distNorm - 0.18) / 0.82), 1.6);

      posAttr.setZ(i, height * edgeFactor * 1.6);
    }
    posAttr.needsUpdate = true;
    groundGeo.computeVertexNormals();

    const groundTex = createEarthTexture();
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // ── Small pond / reflective pool near one edge ───────────────────
    const pondGeo = new THREE.CircleGeometry(7, 40);
    const pondMat = new THREE.MeshStandardMaterial({
      color: 0x2a6fa8,
      roughness: 0.08,
      metalness: 0.6,
      transparent: true,
      opacity: 0.82,
    });
    const pond = new THREE.Mesh(pondGeo, pondMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-34, 0.08, -32);
    this.scene.add(pond);

    // Soft blue point light above pond to fake reflections on nearby geometry
    const pondLight = new THREE.PointLight(0x4488cc, 0.4, 18);
    pondLight.position.set(-34, 2, -32);
    this.scene.add(pondLight);
  }

  private setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.minPolarAngle = 0.1;
    this.controls.maxPolarAngle = 0.5;
    this.controls.minZoom = 0.4;
    this.controls.maxZoom = 3;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.update();
  }

  // ── Input ────────────────────────────────────────────────────────────

  private setupKeyboard() {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.wasdKeys[e.key.toLowerCase()] = true;
    };
    this.keyupHandler = (e: KeyboardEvent) => {
      this.wasdKeys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
  }

  private setupPointerEvents() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointerleave", this.handlePointerLeave);
    canvas.addEventListener("click", this.handleClick);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
  }

  private getMouseNDC(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastUnits(e: MouseEvent): InternalUnit | null {
    this.getMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets = this.internalUnits.map((u) => u.hitTarget);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;
    return this.internalUnits.find((u) => u.hitTarget === hits[0].object) ?? null;
  }

  private raycastPlayers(e: MouseEvent): string | null {
    this.getMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const [, avatar] of this.otherAvatars) {
      const hit = avatar.mesh.userData.hitTarget as THREE.Object3D | undefined;
      if (hit) targets.push(hit);
    }
    if (targets.length === 0) return null;
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;
    return (hits[0].object.userData.playerId as string) ?? null;
  }

  private raycastGround(e: MouseEvent): THREE.Vector3 | null {
    this.getMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, target);
  }

  // Arrow functions preserve `this` binding for event listeners
  private handlePointerDown = (e: PointerEvent) => {
    if (e.button === 2) {
      const hitUnit = this.raycastUnits(e);
      const hitPlayer = this.raycastPlayers(e);
      if (hitUnit || hitPlayer) {
        this.suppressOrbit = true;
        this.controls.enabled = false;
      }
      return;
    }
    if (e.button !== 0) return;
    const hitUnit = this.raycastUnits(e);
    if (hitUnit) {
      this.isDragging = true;
      this.dragUnit = hitUnit;
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(e.pointerId);

      const groundHit = this.raycastGround(e);
      if (groundHit) {
        this.dragOffset.copy(groundHit).sub(new THREE.Vector3(hitUnit.spring.tx, 0, hitUnit.spring.tz));
      }

      if (e.shiftKey) {
        const prev = this.callbacks.getSelectedIds();
        if (prev.includes(hitUnit.id)) {
          this.callbacks.onSelect(prev.filter((id) => id !== hitUnit.id));
        } else {
          this.callbacks.onSelect([...prev, hitUnit.id]);
        }
      } else {
        this.callbacks.onSelect([hitUnit.id]);
      }
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.isDragging && this.dragUnit) {
      const groundHit = this.raycastGround(e);
      if (!groundHit) return;

      const halfBound = GROUND_SIZE / 2 - 1;
      this.dragUnit.spring.tx = Math.max(-halfBound, Math.min(halfBound, groundHit.x - this.dragOffset.x));
      this.dragUnit.spring.tz = Math.max(-halfBound, Math.min(halfBound, groundHit.z - this.dragOffset.z));
      return;
    }
    this.updateHoverFromEvent(e);
  };

  private handlePointerLeave = () => {
    this.clearWorldHover();
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.suppressOrbit) {
      this.suppressOrbit = false;
      this.controls.enabled = true;
    }
    if (this.isDragging && this.dragUnit) {
      this.controls.enabled = true;
      this.renderer.domElement.releasePointerCapture(e.pointerId);
      this.callbacks.onMoveUnit?.(this.dragUnit.id, this.dragUnit.spring.tx, this.dragUnit.spring.tz);
      this.isDragging = false;
      this.dragUnit = null;
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    const hitUnit = this.raycastUnits(e);
    const hitPlayer = this.raycastPlayers(e);
    if (!hitUnit && !hitPlayer) return;
    e.preventDefault();
    this.callbacks.onWorldContextMenu?.(
      {
        unitId: hitUnit?.id,
        playerId: hitPlayer ?? hitUnit?.ownerId,
      },
      e.clientX,
      e.clientY,
    );
  };

  private handleClick = (e: MouseEvent) => {
    if (this.isDragging) return;

    // Check for billboard clicks first
    this.getMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const billboards = this.internalUnits
      .filter((u) => u.tradeBillboard)
      .map((u) => u.tradeBillboard!);
    if (billboards.length > 0) {
      const bbHits = this.raycaster.intersectObjects(billboards, false);
      if (bbHits.length > 0) {
        const offerId = bbHits[0].object.userData.offerId;
        if (offerId != null) {
          this.callbacks.onTradeOfferClick?.(offerId, e.clientX, e.clientY);
          return;
        }
      }
    }

    const hitUnit = this.raycastUnits(e);
    if (hitUnit) {
      this.resetBillboardAge(hitUnit.id);
    } else if (!e.shiftKey) {
      this.callbacks.onSelect([]);
    }
  };

  // ── Resize ───────────────────────────────────────────────────────────

  private setupResizeObserver() {
    this.ro = new ResizeObserver(() => {
      if (this.disposed || !this.renderer) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      if (w < 2 || h < 2) return;
      const a = w / h;
      this.camera.left = (-this.frustum * a) / 2;
      this.camera.right = (this.frustum * a) / 2;
      this.camera.top = this.frustum / 2;
      this.camera.bottom = -this.frustum / 2;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
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

      this.updateAvatarMovement(dt);
      this.updateOtherAvatars(dt);
      this.controls.update();
      this.updateUnits(dt);
      this.updateResources();
      this.updateSelectionPulse();
      this.updateBillboardFade(dt);
      this.updateOwnershipLinePositions();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private updateAvatarMovement(dt: number) {
    const moveDx =
      (this.wasdKeys["d"] || this.wasdKeys["arrowright"] ? 1 : 0) -
      (this.wasdKeys["a"] || this.wasdKeys["arrowleft"] ? 1 : 0);
    const moveDz =
      (this.wasdKeys["s"] || this.wasdKeys["arrowdown"] ? 1 : 0) -
      (this.wasdKeys["w"] || this.wasdKeys["arrowup"] ? 1 : 0);

    if (this.playerAvatar) {
      const moving = moveDx !== 0 || moveDz !== 0;
      if (moving) {
        const len = Math.sqrt(moveDx * moveDx + moveDz * moveDz);
        const nx = moveDx / len;
        const nz = moveDz / len;
        this.playerAvatar.mesh.position.x += nx * AVATAR_MOVE_SPEED * dt;
        this.playerAvatar.mesh.position.z += nz * AVATAR_MOVE_SPEED * dt;

        const hBound = GROUND_SIZE / 2 - 1;
        this.playerAvatar.mesh.position.x = Math.max(-hBound, Math.min(hBound, this.playerAvatar.mesh.position.x));
        this.playerAvatar.mesh.position.z = Math.max(-hBound, Math.min(hBound, this.playerAvatar.mesh.position.z));

        this.playerAvatar.mesh.rotation.y = Math.atan2(nx, nz);
      }

      transitionMovement(this.playerAvatar, moving);

      this.lastAvatarBroadcast += dt;
      if (this.lastAvatarBroadcast >= AVATAR_BROADCAST_INTERVAL && (moving || this.lastAvatarBroadcast > 1.0)) {
        this.lastAvatarBroadcast = 0;
        this.callbacks.onPositionUpdate?.(
          this.playerAvatar.mesh.position.x,
          this.playerAvatar.mesh.position.z,
          this.playerAvatar.mesh.rotation.y,
          moving,
        );
      }

      this.playerAvatar.mixer.update(dt);

      const targetCam = this.playerAvatar.mesh.position.clone().add(AVATAR_CAMERA_OFFSET);
      this.camera.position.lerp(targetCam, AVATAR_CAMERA_LERP);
      this.controls.target.lerp(this.playerAvatar.mesh.position, AVATAR_CAMERA_LERP);
    } else if (moveDx || moveDz) {
      this.controls.target.x += moveDx * 15 * dt;
      this.controls.target.z += moveDz * 15 * dt;
    }
  }

  private updateOtherAvatars(dt: number) {
    for (const [id, avatar] of this.otherAvatars) {
      const target = this.otherAvatarTargets.get(id);
      if (target) {
        const lerpSpeed = 8 * dt;
        avatar.mesh.position.x += (target.x - avatar.mesh.position.x) * lerpSpeed;
        avatar.mesh.position.z += (target.z - avatar.mesh.position.z) * lerpSpeed;
        avatar.mesh.rotation.y += (target.rotY - avatar.mesh.rotation.y) * lerpSpeed;
        transitionMovement(avatar, target.isMoving);
      }
      avatar.mixer.update(dt);
    }
  }

  private updateUnits(dt: number) {
    for (const u of this.internalUnits) {
      u.mixer?.update(dt);

      const wasSettled = springSettled(u.spring);
      if (!wasSettled) {
        springUpdate(u.spring, dt);
        u.mesh.position.set(u.spring.cx, u.spring.cy, u.spring.cz);

        const dx = u.spring.tx - u.spring.cx;
        const dz = u.spring.tz - u.spring.cz;
        if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
          u.mesh.rotation.y = Math.atan2(dx, dz);
        }
      }

      const moving = !springSettled(u.spring, 0.1);
      if (moving !== u.isMoving) {
        u.isMoving = moving;
        if (moving) {
          // Movement takes priority over task animations
          const target = u.walkAction;
          if (target) { target.reset().fadeIn(0.2).play(); }
          u.idleAction?.fadeOut(0.2);
          u.gatherAction?.fadeOut(0.2);
          u.craftAction?.fadeOut(0.2);
        } else {
          // Settled: choose animation based on current task
          const task = u.taskType;
          if (task === 'gather' && u.gatherAction) {
            u.gatherAction.reset().fadeIn(0.2).play();
            u.idleAction?.fadeOut(0.2);
            u.walkAction?.fadeOut(0.2);
          } else if (task === 'craft' && u.craftAction) {
            u.craftAction.reset().fadeIn(0.2).play();
            u.idleAction?.fadeOut(0.2);
            u.walkAction?.fadeOut(0.2);
          } else if (u.idleAction) {
            u.idleAction.reset().fadeIn(0.2).play();
            u.walkAction?.fadeOut(0.2);
          }
        }
      }

      if (u.healthBar) {
        u.healthBar.quaternion.copy(this.camera.quaternion);
      }
    }
  }

  private updateResources() {
    for (const res of this.internalResources) {
      res.mesh.position.y = Math.sin(this.elapsed * 1.2 + res.mesh.position.x * 0.5) * 0.06;
    }
  }

  private updateSelectionPulse() {
    const pulse = 0.35 + Math.sin(this.elapsed * 3) * 0.15;
    for (const u of this.internalUnits) {
      if (u.ring) {
        (u.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }
  }

  // ── Asset loading ────────────────────────────────────────────────────

  private async loadAssets(
    units: ColonyUnit[],
    resources: ColonyResource[] | undefined,
    playerName?: string,
    playerCharacter?: CharacterClass,
  ) {
    onLoadProgress((loaded, total) =>
      this.callbacks.onLoadProgress?.(Math.round((loaded / Math.max(total, 1)) * 100)),
    );

    try {
      this.sharedAnimations = await loadSharedAnimations();
      if (this.disposed) return;

      // Preload character models for units
      const neededChars = new Set<string>();
      units.forEach((_pu, i) => {
        neededChars.add(ASSETS.characters[skeletonForIndex(i)]);
      });
      neededChars.add(ASSETS.characters.skeleton_minion);
      neededChars.add(ASSETS.characters.skeleton_warrior);
      neededChars.add(ASSETS.characters.skeleton_mage);
      neededChars.add(ASSETS.characters.skeleton_rogue);
      await preloadModels([...neededChars]);
      if (this.disposed) return;

      // Spawn units
      const unitPromises = units.map((pu, i) => this.createUnit(pu, i));
      this.internalUnits = await Promise.all(unitPromises);
      this.syncSelectionVisuals();

      // Spawn resources
      await this.spawnResources(resources);
      if (this.disposed) return;

      // Spawn structures
      await this.spawnStructures();
      if (this.disposed) return;

      // Scatter environment props (rocks, bushes, grass) — fire and forget
      this.scatterEnvironment().catch(() => {/* non-fatal */});

      // Spawn player avatar
      if (playerName) {
        await this.spawnPlayerAvatar(playerName, playerCharacter || "knight");
      }

      // Auto-center camera
      this.centerCamera();

      this.callbacks.onAssetsReady?.();
      this.callbacks.onLoadProgress?.(100);
    } catch (error) {
      console.error("[ColonyScene] Asset loading failed:", error);
      this.callbacks.onAssetsReady?.();
    }
  }

  private async createUnit(pu: ColonyUnit, index: number): Promise<InternalUnit> {
    const skelClass = skeletonForIndex(index);
    const charClass = pu.characterClass || skelClass;
    const assetPath = ASSETS.characters[charClass] || ASSETS.characters[skelClass];
    const { scene: model, animations } = await loadModel(assetPath);
    model.scale.setScalar(CHARACTER_SCALE);

    const group = new THREE.Group();
    group.add(model);

    const hitTarget = createHitTarget();
    group.add(hitTarget);

    const teamRing = createTeamRing(pu.team);
    teamRing.userData.isTeamRing = true;
    group.add(teamRing);

    let healthBar: THREE.Group | undefined;
    if (pu.health != null && pu.maxHealth != null && pu.maxHealth > 0) {
      healthBar = createHealthBar(pu.health, pu.maxHealth);
      healthBar.userData.isHealthBar = true;
      group.add(healthBar);
    }

    group.position.set(pu.x, 0, pu.z);
    this.scene.add(group);

    const mixer = new THREE.AnimationMixer(model);
    const { idle, walk } = setupAnimationActions(mixer, animations, this.sharedAnimations);

    // Look for dedicated gather / craft clips; fall back to walk / idle respectively
    const allClips = [...animations, ...(this.sharedAnimations.idle ? [this.sharedAnimations.idle] : []), ...(this.sharedAnimations.walk ? [this.sharedAnimations.walk] : [])];
    const gatherClip = allClips.find(c => /gather|mine|harvest|chop|attack/i.test(c.name));
    const craftClip = allClips.find(c => /craft|forge|build|interact|work/i.test(c.name));
    const gatherAction = gatherClip ? mixer.clipAction(gatherClip) : walk;
    const craftAction = craftClip ? mixer.clipAction(craftClip) : idle;

    idle?.play();

    return {
      id: pu.id,
      team: pu.team,
      ownerId: pu.ownerId,
      characterClass: charClass,
      mesh: group,
      hitTarget,
      billboardAge: 0,
      spring: { cx: pu.x, cy: 0, cz: pu.z, tx: pu.x, ty: 0, tz: pu.z, vx: 0, vy: 0, vz: 0 },
      mixer,
      idleAction: idle,
      walkAction: walk,
      gatherAction,
      craftAction,
      isMoving: false,
      taskType: pu.taskType,
      healthBar,
    };
  }

  private async spawnResources(resources?: ColonyResource[]) {
    const toSpawn = resources && resources.length > 0
      ? resources
      : [
        { id: "deco-wood", type: "wood", x: -18, z: -12, amount: 10, maxAmount: 20 },
        { id: "deco-stone", type: "stone", x: 15, z: -20, amount: 8, maxAmount: 15 },
        { id: "deco-metal", type: "metal_ore", x: -22, z: 18, amount: 6, maxAmount: 12 },
        { id: "deco-gems", type: "gems", x: 20, z: 15, amount: 4, maxAmount: 10 },
        { id: "deco-food", type: "food", x: -8, z: 25, amount: 12, maxAmount: 20 },
      ];

    const resPaths = new Set<string>();
    for (const r of toSpawn) resPaths.add(resourceTypeToAsset(r.type, r.amount));
    await preloadModels([...resPaths]);

    for (const res of toSpawn) {
      try {
        const assetPath = resourceTypeToAsset(res.type, res.amount);
        const { scene: model } = await loadModel(assetPath);
        const group = new THREE.Group();
        model.scale.setScalar(1.5);
        group.add(model);
        group.position.set(res.x, 0, res.z);
        group.userData.resourceId = res.id;
        this.scene.add(group);
        this.internalResources.push({ id: res.id, type: res.type, mesh: group, amount: res.amount, maxAmount: res.maxAmount });
      } catch {
        /* skip */
      }
    }
  }

  private async spawnStructures() {
    try {
      const { scene: chest } = await loadModel(ASSETS.structures.chest_gold);
      chest.scale.setScalar(2.0);
      chest.position.set(0, 0, 0);
      this.scene.add(chest);

      const { scene: barrel1 } = await loadModel(ASSETS.structures.barrel_decorated);
      barrel1.scale.setScalar(1.5);
      barrel1.position.set(-2.5, 0, 1);
      this.scene.add(barrel1);

      const { scene: barrel2 } = await loadModel(ASSETS.structures.barrel);
      barrel2.scale.setScalar(1.5);
      barrel2.position.set(2.5, 0, 1);
      this.scene.add(barrel2);

      const { scene: redBanner } = await loadModel(ASSETS.structures.banner_red);
      redBanner.scale.setScalar(1.8);
      redBanner.position.set(-4, 0, -2);
      this.scene.add(redBanner);

      const { scene: blueBanner } = await loadModel(ASSETS.structures.banner_blue);
      blueBanner.scale.setScalar(1.8);
      blueBanner.position.set(4, 0, -2);
      this.scene.add(blueBanner);
    } catch (e) {
      console.warn("[ColonyScene] Failed to load structure assets:", e);
    }
  }

  private async scatterEnvironment() {
    const envNoise = createNoise2D();
    const half = GROUND_SIZE / 2 - 1;

    // Each definition: asset path, instance count, scale range [min,max],
    // distance range [minRadius, maxRadius] from center, and a noiseAffinity
    // value that gates placement: >0 = prefers high-noise spots (rocky/bushy),
    // <0 = prefers low-noise spots (open grass), 0 = unconstrained.
    const defs: Array<{
      path: string;
      count: number;
      scale: [number, number];
      minR: number;
      maxR: number;
      noiseAffinity: number;
    }> = [
      // Large rocks — toward edges and mid-distance
      { path: ASSETS.environment.rock_1a, count: 20, scale: [1.0, 2.4], minR: 14, maxR: half, noiseAffinity: 0.6 },
      { path: ASSETS.environment.rock_1b, count: 14, scale: [0.7, 1.7], minR: 12, maxR: half, noiseAffinity: 0.4 },
      // Bushes — clustered at mid-range; prefer noisier areas
      { path: ASSETS.environment.bush_1a, count: 18, scale: [1.2, 2.6], minR: 13, maxR: half - 1, noiseAffinity: 0.5 },
      { path: ASSETS.environment.bush_2a, count: 14, scale: [1.0, 2.2], minR: 11, maxR: half - 2, noiseAffinity: 0.3 },
      // Grass tufts — spread throughout, including closer to center
      { path: ASSETS.environment.grass_1a, count: 38, scale: [0.8, 1.9], minR: 9, maxR: half, noiseAffinity: -0.2 },
      { path: ASSETS.environment.grass_1b, count: 30, scale: [0.7, 1.6], minR: 7, maxR: half, noiseAffinity: -0.3 },
    ];

    for (const def of defs) {
      try {
        const { scene: model } = await loadModel(def.path);
        if (this.disposed) return;

        // Attempt up to count * 2 placements (reject by noise affinity)
        let placed = 0;
        for (let attempt = 0; attempt < def.count * 3 && placed < def.count; attempt++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = def.minR + Math.random() * (def.maxR - def.minR);
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;

          // Sample coarse noise for zone gating
          const n = envNoise(x * 0.07, z * 0.07);
          if (def.noiseAffinity > 0 && n < def.noiseAffinity - 0.8) continue;
          if (def.noiseAffinity < 0 && n > -def.noiseAffinity + 0.8) continue;

          const clone = model.clone();
          clone.position.set(x, 0, z);
          clone.rotation.y = Math.random() * Math.PI * 2;
          const s = def.scale[0] + Math.random() * (def.scale[1] - def.scale[0]);
          clone.scale.setScalar(s);
          clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.scene.add(clone);
          placed++;
        }
      } catch {
        // asset missing — skip silently
      }
    }

    // Perimeter boundary: tight clusters of rocks at compass points to frame the map
    const perimeterAnchors = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const anchor of perimeterAnchors) {
      for (let j = 0; j < 5; j++) {
        const spreadAngle = anchor + (Math.random() - 0.5) * 0.55;
        const dist = half - 1 + Math.random() * 2;
        const px = Math.cos(spreadAngle) * dist;
        const pz = Math.sin(spreadAngle) * dist;
        try {
          const path = Math.random() > 0.5 ? ASSETS.environment.rock_1a : ASSETS.environment.rock_1b;
          const { scene: rock } = await loadModel(path);
          if (this.disposed) return;
          rock.position.set(px, 0, pz);
          rock.rotation.y = Math.random() * Math.PI * 2;
          const s = 1.4 + Math.random() * 1.6;
          rock.scale.setScalar(s);
          rock.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; }
          });
          this.scene.add(rock);
        } catch { /* skip */ }
      }
    }
  }

  private async spawnPlayerAvatar(name: string, charClass: CharacterClass) {
    try {
      const charPath = ASSETS.characters[charClass];
      await preloadModels([charPath]);
      const { scene: model, animations } = await loadModel(charPath);
      model.scale.setScalar(CHARACTER_SCALE);

      const group = new THREE.Group();
      group.add(model);
      group.position.set(0, 0, 5);

      const nameSprite = createNameSprite(name);
      group.add(nameSprite);
      this.scene.add(group);

      const mixer = new THREE.AnimationMixer(model);
      const { idle, walk } = setupAnimationActions(mixer, animations, this.sharedAnimations);
      idle?.play();

      this.playerAvatar = { id: name, mesh: group, mixer, idleAction: idle, walkAction: walk, isMoving: false, nameSprite };
    } catch (e) {
      console.warn("[ColonyScene] Failed to spawn player avatar:", e);
    }
  }

  private centerCamera() {
    if (this.playerAvatar) {
      const pos = this.playerAvatar.mesh.position;
      this.controls.target.set(pos.x, 0, pos.z);
      this.camera.position.set(pos.x + AVATAR_CAMERA_OFFSET.x, AVATAR_CAMERA_OFFSET.y, pos.z + AVATAR_CAMERA_OFFSET.z);
    } else if (this.internalUnits.length > 0) {
      let cx = 0, cz = 0;
      for (const u of this.internalUnits) { cx += u.spring.tx; cz += u.spring.tz; }
      cx /= this.internalUnits.length;
      cz /= this.internalUnits.length;
      this.controls.target.set(cx, 0, cz);
      this.camera.position.x += cx;
      this.camera.position.z += cz;
    }
    this.controls.update();
  }

  // ── Selection visuals ────────────────────────────────────────────────

  syncSelectionVisuals() {
    const ids = this.callbacks.getSelectedIds();
    for (const u of this.internalUnits) {
      const isSelected = ids.includes(u.id);
      if (isSelected && !u.ring) {
        const ring = createSelectionRing();
        u.mesh.add(ring);
        u.ring = ring;
      } else if (!isSelected && u.ring) {
        u.mesh.remove(u.ring);
        u.ring.geometry.dispose();
        (u.ring.material as THREE.Material).dispose();
        u.ring = undefined;
      }
    }
  }

  highlightUnit(id: number | null) {
    const unit = id != null ? this.internalUnits.find((u) => u.id === id) : undefined;
    this.setHoverFocus(unit ? { unitId: unit.id, ownerId: unit.ownerId } : null);
  }

  setLocalPlayerId(id: string | null) {
    this.localPlayerId = id;
  }

  setHoverFocus(focus: HoverFocus | null) {
    this.hoverFocus = focus;
    const highlightIds = new Set<number>();
    if (focus?.unitId != null) highlightIds.add(focus.unitId);
    if (focus?.ownerId) {
      for (const u of this.internalUnits) {
        if (u.ownerId === focus.ownerId) highlightIds.add(u.id);
      }
    }
    for (const u of this.internalUnits) {
      const on = highlightIds.has(u.id);
      if (on && !u.hoverRing) {
        const ring = createHoverRing();
        u.mesh.add(ring);
        u.hoverRing = ring;
      } else if (!on && u.hoverRing) {
        u.mesh.remove(u.hoverRing);
        u.hoverRing.geometry.dispose();
        (u.hoverRing.material as THREE.Material).dispose();
        u.hoverRing = undefined;
      }
    }
    this.rebuildOwnershipLines();
  }

  private updateHoverFromEvent(e: PointerEvent) {
    const unit = this.raycastUnits(e);
    const player = unit ? null : this.raycastPlayers(e);
    const unitId = unit?.id ?? null;
    const playerId = player ?? unit?.ownerId ?? null;

    if (unitId !== this.lastHoverUnitId) {
      this.lastHoverUnitId = unitId;
      this.callbacks.onHoverUnit?.(unitId);
    }
    if (playerId !== this.lastHoverPlayerId) {
      this.lastHoverPlayerId = playerId;
      this.callbacks.onHoverPlayer?.(playerId);
    }

    this.setHoverFocus(
      unit
        ? { unitId: unit.id, ownerId: unit.ownerId }
        : player
          ? { ownerId: player }
          : null,
    );
    this.renderer.domElement.style.cursor = unit || player ? "pointer" : "";
  }

  private clearWorldHover() {
    if (this.lastHoverUnitId != null) {
      this.lastHoverUnitId = null;
      this.callbacks.onHoverUnit?.(null);
    }
    if (this.lastHoverPlayerId != null) {
      this.lastHoverPlayerId = null;
      this.callbacks.onHoverPlayer?.(null);
    }
    this.setHoverFocus(null);
    this.renderer.domElement.style.cursor = "";
  }

  private avatarPosition(ownerId: string): THREE.Vector3 | null {
    if (this.localPlayerId && ownerId === this.localPlayerId && this.playerAvatar) {
      return this.playerAvatar.mesh.position;
    }
    const avatar = this.otherAvatars.get(ownerId);
    return avatar ? avatar.mesh.position : null;
  }

  private clearOwnershipLines() {
    for (const line of this.ownershipLines) {
      this.scene?.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.ownershipLines = [];
  }

  private rebuildOwnershipLines() {
    this.clearOwnershipLines();
    if (!this.scene || !this.hoverFocus) return;
    const ownerId =
      this.hoverFocus.ownerId ??
      this.internalUnits.find((u) => u.id === this.hoverFocus?.unitId)?.ownerId;
    if (!ownerId) return;
    const from = this.avatarPosition(ownerId);
    if (!from) return;

    const units =
      this.hoverFocus.unitId != null && !this.hoverFocus.ownerId
        ? this.internalUnits.filter((u) => u.id === this.hoverFocus!.unitId)
        : this.internalUnits.filter((u) => u.ownerId === ownerId);

    for (const u of units) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(from.x, 1.4, from.z),
        new THREE.Vector3(u.mesh.position.x, 1.4, u.mesh.position.z),
      ]);
      const mat = new THREE.LineDashedMaterial({
        color: 0xfbbf24,
        dashSize: 0.4,
        gapSize: 0.22,
        transparent: true,
        opacity: 0.7,
      });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      this.scene.add(line);
      this.ownershipLines.push(line);
    }
  }

  private updateOwnershipLinePositions() {
    if (this.ownershipLines.length === 0 || !this.hoverFocus) return;
    const ownerId =
      this.hoverFocus.ownerId ??
      this.internalUnits.find((u) => u.id === this.hoverFocus?.unitId)?.ownerId;
    if (!ownerId) return;
    const from = this.avatarPosition(ownerId);
    if (!from) return;

    const units =
      this.hoverFocus.unitId != null && !this.hoverFocus.ownerId
        ? this.internalUnits.filter((u) => u.id === this.hoverFocus!.unitId)
        : this.internalUnits.filter((u) => u.ownerId === ownerId);

    for (let i = 0; i < this.ownershipLines.length; i++) {
      const u = units[i];
      if (!u) continue;
      const pos = this.ownershipLines[i].geometry.getAttribute("position");
      pos.setXYZ(0, from.x, 1.4, from.z);
      pos.setXYZ(1, u.mesh.position.x, 1.4, u.mesh.position.z);
      pos.needsUpdate = true;
      this.ownershipLines[i].computeLineDistances();
    }
  }

  // ── Public API for reactive updates ──────────────────────────────────

  updateTeamColors(propUnits: ColonyUnit[]) {
    for (const pu of propUnits) {
      const iu = this.internalUnits.find((u) => u.id === pu.id);
      if (iu && iu.team !== pu.team) {
        iu.team = pu.team;
        const rings = iu.mesh.children.filter((c) => c.userData.isTeamRing);
        for (const r of rings) {
          ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(TEAM_COLOR[pu.team]);
        }
      }
    }
  }

  updateUnitPositions(propUnits: ColonyUnit[]) {
    for (const pu of propUnits) {
      const iu = this.internalUnits.find((u) => u.id === pu.id);
      if (iu) {
        iu.spring.tx = pu.x;
        iu.spring.tz = pu.z;
        iu.taskType = pu.taskType;
        iu.ownerId = pu.ownerId;
      }
    }
  }

  syncUnits(propUnits: ColonyUnit[]) {
    if (!this.scene) return;
    const propIds = new Set(propUnits.map((u) => u.id));
    const internalIds = new Set(this.internalUnits.map((u) => u.id));

    const toRemove = this.internalUnits.filter((iu) => !propIds.has(iu.id));
    for (const iu of toRemove) {
      iu.mixer?.stopAllAction();
      this.scene.remove(iu.mesh);
      disposeModel(iu.mesh);
    }
    if (toRemove.length > 0) {
      this.internalUnits = this.internalUnits.filter((iu) => propIds.has(iu.id));
    }

    const toAdd = propUnits.filter((pu) => !internalIds.has(pu.id));
    for (const pu of toAdd) {
      const idx = propUnits.indexOf(pu);
      this.createUnit(pu, idx)
        .then((iu) => {
          this.internalUnits.push(iu);
          this.syncSelectionVisuals();
        })
        .catch((err) => console.warn("[ColonyScene] Failed to create dynamic unit:", err));
    }
  }

  // ── Buildings ────────────────────────────────────────────────────────

  private async createBuilding(b: ColonyBuilding): Promise<InternalBuilding> {
    const assetPath = buildingTypeToAsset(b.buildingType);
    const { scene: model } = await loadModel(assetPath);
    model.scale.setScalar(2.2);

    const group = new THREE.Group();
    group.add(model);
    group.position.set(b.x, 0, b.z);
    group.userData.buildingId = b.id;
    this.scene.add(group);

    // Construction progress bar (shown when not fully built)
    let progressBar: THREE.Mesh | undefined;
    const progress = b.constructionProgress ?? 0;
    const max = b.constructionMax ?? 1;
    if (progress < max) {
      progressBar = this.makeProgressBar(progress / max);
      group.add(progressBar);
    }

    return { id: b.id, buildingType: b.buildingType, mesh: group, progressBar };
  }

  private makeProgressBar(ratio: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(1.0 * ratio, 0.12);
    const color = ratio < 0.4 ? 0xef4444 : ratio < 0.7 ? 0xfbbf24 : 0x4ade80;
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(-(1.0 * (1 - ratio)) / 2, 3.2, 0);
    bar.userData.isProgressBar = true;
    return bar;
  }

  syncBuildings(propBuildings: ColonyBuilding[]) {
    if (!this.scene) return;
    const propIds = new Set(propBuildings.map((b) => b.id));
    const internalIds = new Set(this.internalBuildings.map((b) => b.id));

    // Remove stale buildings
    const toRemove = this.internalBuildings.filter((ib) => !propIds.has(ib.id));
    for (const ib of toRemove) {
      this.scene.remove(ib.mesh);
      disposeModel(ib.mesh);
    }
    if (toRemove.length > 0) {
      this.internalBuildings = this.internalBuildings.filter((ib) => propIds.has(ib.id));
    }

    // Add new buildings
    const toAdd = propBuildings.filter((pb) => !internalIds.has(pb.id));
    for (const pb of toAdd) {
      this.createBuilding(pb)
        .then((ib) => this.internalBuildings.push(ib))
        .catch((err) => console.warn("[ColonyScene] Failed to create building:", err));
    }

    // Update progress bars for existing buildings
    for (const pb of propBuildings) {
      const ib = this.internalBuildings.find((b) => b.id === pb.id);
      if (!ib) continue;
      const progress = pb.constructionProgress ?? 0;
      const max = pb.constructionMax ?? 1;
      const ratio = Math.min(1, progress / Math.max(max, 1));

      if (ib.progressBar) {
        ib.mesh.remove(ib.progressBar);
        (ib.progressBar.material as THREE.Material).dispose();
        ib.progressBar.geometry.dispose();
        ib.progressBar = undefined;
      }
      if (ratio < 1) {
        ib.progressBar = this.makeProgressBar(ratio);
        ib.mesh.add(ib.progressBar);
      }
    }
  }

  updateTradeOffers(offers: ActiveTradeOffer[]) {
    const offersByUnit = new Map<number, ActiveTradeOffer>();
    for (const o of offers) offersByUnit.set(o.unitId, o);

    for (const iu of this.internalUnits) {
      const offer = offersByUnit.get(iu.id);
      if (offer) {
        if (!iu.tradeBillboard || iu.tradeBillboard.userData.offerId !== offer.offerId) {
          if (iu.tradeBillboard) {
            iu.mesh.remove(iu.tradeBillboard);
            disposeTradeBillboard(iu.tradeBillboard);
          }
          const bb = createTradeBillboard({
            offerId: offer.offerId,
            type: offer.type,
            price: offer.price,
            color: offer.color,
          });
          iu.mesh.add(bb);
          iu.tradeBillboard = bb;
          iu.billboardAge = 0;
        }
      } else if (iu.tradeBillboard) {
        iu.mesh.remove(iu.tradeBillboard);
        disposeTradeBillboard(iu.tradeBillboard);
        iu.tradeBillboard = undefined;
      }
    }
  }

  private updateBillboardFade(dt: number) {
    const SHOW_DURATION = 30;
    const FADE_DURATION = 2;

    for (const iu of this.internalUnits) {
      if (!iu.tradeBillboard) continue;
      iu.billboardAge += dt;
      const mat = iu.tradeBillboard.material as THREE.SpriteMaterial;
      if (iu.billboardAge > SHOW_DURATION) {
        const fadeProgress = Math.min((iu.billboardAge - SHOW_DURATION) / FADE_DURATION, 1);
        mat.opacity = 1 - fadeProgress;
      } else {
        mat.opacity = 1;
      }
      iu.tradeBillboard.lookAt(this.camera.position);
    }
  }

  resetBillboardAge(unitId: number) {
    const iu = this.internalUnits.find((u) => u.id === unitId);
    if (iu) iu.billboardAge = 0;
  }

  updateOtherPlayers(players: OtherPlayerAvatar[]) {
    if (!this.scene) return;

    const existingIds = new Set(this.otherAvatars.keys());
    const newIds = new Set(players.map((p) => p.id));

    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const a = this.otherAvatars.get(id)!;
        a.mixer.stopAllAction();
        disposeModel(a.mesh);
        this.scene.remove(a.mesh);
        this.otherAvatars.delete(id);
        this.otherAvatarTargets.delete(id);
      }
    }

    for (const p of players) {
      this.otherAvatarTargets.set(p.id, { x: p.x, z: p.z, rotY: p.rotationY, isMoving: p.isMoving });

      if (!this.otherAvatars.has(p.id)) {
        const charPath = ASSETS.characters[p.characterClass || "knight"];
        loadModel(charPath).then(({ scene: model, animations }) => {
          model.scale.setScalar(CHARACTER_SCALE);
          const group = new THREE.Group();
          group.add(model);
          group.position.set(p.x, 0, p.z);

          const nameSprite = createNameSprite(p.name);
          group.add(nameSprite);
          const hitTarget = createHitTarget();
          hitTarget.userData.playerId = p.id;
          group.add(hitTarget);
          group.userData.hitTarget = hitTarget;
          this.scene.add(group);

          const mixer = new THREE.AnimationMixer(model);
          const { idle, walk } = setupAnimationActions(mixer, animations, this.sharedAnimations);
          idle?.play();

          this.otherAvatars.set(p.id, { id: p.id, mesh: group, mixer, idleAction: idle, walkAction: walk, isMoving: false, nameSprite });
        }).catch(() => {});
      }
    }
  }
}
