import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  loadModel,
  preloadModels,
  disposeModel,
  onLoadProgress,
  ASSETS,
  characterForIndex,
  resourceTypeToAsset,
  type CharacterClass,
} from "./asset-loader";
import {
  type ManagedCharacter,
  type SharedAnimations,
  waitForDimensions,
  createNameSprite,
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

export interface ColonySceneCallbacks {
  onSelect: (ids: number[]) => void;
  onMoveUnit?: (id: number, x: number, z: number) => void;
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
  onLoadProgress?: (progress: number) => void;
  onAssetsReady?: () => void;
  getSelectedIds: () => number[];
}

// ── Constants ──────────────────────────────────────────────────────────

const TEAM_COLOR: Record<TeamColor, number> = { red: 0xd93025, blue: 0x1a73e8, unset: 0x80868b };
const GROUND_SIZE = 80;
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
  characterClass: CharacterClass;
  mesh: THREE.Group;
  hitTarget: THREE.Mesh;
  ring?: THREE.Mesh;
  spring: Spring3;
  mixer?: THREE.AnimationMixer;
  idleAction?: THREE.AnimationAction;
  walkAction?: THREE.AnimationAction;
  isMoving: boolean;
  healthBar?: THREE.Group;
}

interface InternalResource {
  id: string;
  type: string;
  mesh: THREE.Group;
  amount: number;
  maxAmount: number;
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

  constructor(container: HTMLElement, callbacks: ColonySceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  async init(
    units: ColonyUnit[],
    resources: ColonyResource[] | undefined,
    playerName?: string,
    playerCharacter?: CharacterClass,
  ) {
    const dims = await waitForDimensions(this.container);
    if (!dims || this.disposed) return;
    const { w, h } = dims;

    this.buildScene(w, h);
    this.buildStaticGeometry();
    this.setupControls();
    this.setupPointerEvents();
    this.setupKeyboard();
    this.setupResizeObserver();
    this.startLoop();

    await this.loadAssets(units, resources, playerName, playerCharacter);
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
      canvas.removeEventListener("click", this.handleClick);
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
    this.scene.background = new THREE.Color(0x1a1a10);
    this.scene.fog = new THREE.Fog(0x1a1a10, 60, 120);

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
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const sun = new THREE.DirectionalLight(0xfff5e1, 1.4);
    sun.position.set(25, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb0c4de, 0.3);
    fill.position.set(-15, 20, -10);
    this.scene.add(fill);

    const warmLight = new THREE.PointLight(0xffaa44, 0.6, 30);
    warmLight.position.set(0, 3, 0);
    this.scene.add(warmLight);

    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundTex = createEarthTexture();
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
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
    canvas.addEventListener("click", this.handleClick);
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

  private raycastGround(e: MouseEvent): THREE.Vector3 | null {
    this.getMouseNDC(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, target);
  }

  // Arrow functions preserve `this` binding for event listeners
  private handlePointerDown = (e: PointerEvent) => {
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
    if (!this.isDragging || !this.dragUnit) return;
    const groundHit = this.raycastGround(e);
    if (!groundHit) return;

    const halfBound = GROUND_SIZE / 2 - 1;
    this.dragUnit.spring.tx = Math.max(-halfBound, Math.min(halfBound, groundHit.x - this.dragOffset.x));
    this.dragUnit.spring.tz = Math.max(-halfBound, Math.min(halfBound, groundHit.z - this.dragOffset.z));
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.isDragging && this.dragUnit) {
      this.controls.enabled = true;
      this.renderer.domElement.releasePointerCapture(e.pointerId);
      this.callbacks.onMoveUnit?.(this.dragUnit.id, this.dragUnit.spring.tx, this.dragUnit.spring.tz);
      this.isDragging = false;
      this.dragUnit = null;
    }
  };

  private handleClick = (e: MouseEvent) => {
    if (this.isDragging) return;
    const hitUnit = this.raycastUnits(e);
    if (!hitUnit && !e.shiftKey) {
      this.callbacks.onSelect([]);
    }
  };

  // ── Resize ───────────────────────────────────────────────────────────

  private setupResizeObserver() {
    this.ro = new ResizeObserver(() => {
      if (this.disposed) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;
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
        if (moving && u.walkAction) {
          u.walkAction.reset().fadeIn(0.2).play();
          u.idleAction?.fadeOut(0.2);
        } else if (!moving && u.idleAction) {
          u.idleAction.reset().fadeIn(0.2).play();
          u.walkAction?.fadeOut(0.2);
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
      units.forEach((pu, i) => {
        const cls = pu.characterClass || characterForIndex(i);
        neededChars.add(ASSETS.characters[cls]);
      });
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
    const charClass = pu.characterClass || characterForIndex(index);
    const assetPath = ASSETS.characters[charClass];
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
    idle?.play();

    return {
      id: pu.id,
      team: pu.team,
      characterClass: charClass,
      mesh: group,
      hitTarget,
      spring: { cx: pu.x, cy: 0, cz: pu.z, tx: pu.x, ty: 0, tz: pu.z, vx: 0, vy: 0, vz: 0 },
      mixer,
      idleAction: idle,
      walkAction: walk,
      isMoving: false,
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
