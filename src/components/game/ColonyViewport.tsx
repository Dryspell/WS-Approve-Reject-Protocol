import { createSignal, onMount, onCleanup, createEffect, Accessor } from "solid-js";
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
} from "~/lib/asset-loader";

// ── Public types ────────────────────────────────────────────────────────

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

export interface ColonyViewportProps {
  units: ColonyUnit[];
  resources?: ColonyResource[];
  selectedIds: Accessor<number[]>;
  onSelect: (ids: number[]) => void;
  onMoveUnit?: (id: number, x: number, z: number) => void;
  onSetTeam?: (ids: number[], team: TeamColor) => void;
  onSelectResource?: (id: string) => void;
}

// ── Constants ───────────────────────────────────────────────────────────

const TEAM_COLOR: Record<TeamColor, number> = {
  red: 0xd93025,
  blue: 0x1a73e8,
  unset: 0x80868b,
};

const GROUND_SIZE = 80;
const CHARACTER_SCALE = 1.4;

// ── Spring helper ───────────────────────────────────────────────────────

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

// ── Internal unit data ──────────────────────────────────────────────────

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

// ── Mesh factories ──────────────────────────────────────────────────────

function createTeamRing(team: TeamColor): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.65, 0.85, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: TEAM_COLOR[team],
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

function createSelectionRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.9, 1.05, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
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
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x1a1a2e,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  group.add(bg);

  const ratio = Math.max(0, health / maxHealth);
  const fillGeo = new THREE.PlaneGeometry(1.16 * ratio, 0.08);
  const color = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfbbf24 : 0xef4444;
  const fillMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.x = (1.16 * (ratio - 1)) / 2;
  group.add(fill);

  group.position.y = 2.6;
  group.rotation.x = 0;
  return group;
}

function createGridTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#2d3322";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  const step = size / 16;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// ── Component ───────────────────────────────────────────────────────────

export default function ColonyViewport(props: ColonyViewportProps) {
  let containerRef!: HTMLDivElement;

  const [loadingProgress, setLoadingProgress] = createSignal(0);
  const [assetsReady, setAssetsReady] = createSignal(false);

  let internalUnits: InternalUnit[] = [];
  let internalResources: InternalResource[] = [];
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let animationId: number;
  let clock: THREE.Clock;
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Animation clip cache (shared across all units)
  let sharedAnimations: {
    idle?: THREE.AnimationClip;
    walk?: THREE.AnimationClip;
    run?: THREE.AnimationClip;
    interact?: THREE.AnimationClip;
  } = {};

  // Drag state
  let isDragging = false;
  let dragUnit: InternalUnit | null = null;
  const dragOffset = new THREE.Vector3();

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function getMouseNDC(e: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function raycastUnits(e: MouseEvent): InternalUnit | null {
    getMouseNDC(e);
    raycaster.setFromCamera(mouse, camera);
    const targets = internalUnits.map((u) => u.hitTarget);
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;
    return internalUnits.find((u) => u.hitTarget === hits[0].object) ?? null;
  }

  function raycastGround(e: MouseEvent): THREE.Vector3 | null {
    getMouseNDC(e);
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, target);
  }

  // ── Selection visuals ───────────────────────────────────────────────

  function syncSelectionVisuals() {
    const ids = props.selectedIds();
    for (const u of internalUnits) {
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

  // ── Team color sync ─────────────────────────────────────────────────

  createEffect(() => {
    const propUnits = props.units;
    for (const pu of propUnits) {
      const iu = internalUnits.find((u) => u.id === pu.id);
      if (iu && iu.team !== pu.team) {
        iu.team = pu.team;
        // Update team ring color
        const existingRings = iu.mesh.children.filter(
          (c) => c.userData.isTeamRing,
        );
        for (const r of existingRings) {
          ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(
            TEAM_COLOR[pu.team],
          );
        }
      }
    }
  });

  createEffect(() => {
    props.selectedIds();
    syncSelectionVisuals();
  });

  // ── Unit position sync ──────────────────────────────────────────────

  createEffect(() => {
    const propUnits = props.units;
    for (const pu of propUnits) {
      const iu = internalUnits.find((u) => u.id === pu.id);
      if (iu) {
        iu.spring.tx = pu.x;
        iu.spring.tz = pu.z;
      }
    }
  });

  // ── Dynamic unit add/remove ────────────────────────────────────────

  createEffect(() => {
    const propUnits = props.units;
    if (!scene) return;

    const propIds = new Set(propUnits.map((u) => u.id));
    const internalIds = new Set(internalUnits.map((u) => u.id));

    // Remove units no longer in props
    const toRemove = internalUnits.filter((iu) => !propIds.has(iu.id));
    for (const iu of toRemove) {
      iu.mixer?.stopAllAction();
      scene.remove(iu.mesh);
      disposeModel(iu.mesh);
    }
    if (toRemove.length > 0) {
      internalUnits = internalUnits.filter((iu) => propIds.has(iu.id));
    }

    // Add units that are new in props
    const toAdd = propUnits.filter((pu) => !internalIds.has(pu.id));
    for (const pu of toAdd) {
      const idx = propUnits.indexOf(pu);
      createUnit(pu, idx).then((iu) => {
        internalUnits.push(iu);
        syncSelectionVisuals();
      }).catch((err) => {
        console.warn("[ColonyViewport] Failed to create dynamic unit:", err);
      });
    }
  });

  // ── Pointer handlers ────────────────────────────────────────────────

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;

    const hitUnit = raycastUnits(e);
    if (hitUnit) {
      isDragging = true;
      dragUnit = hitUnit;
      controls.enabled = false;
      renderer.domElement.setPointerCapture(e.pointerId);

      const groundHit = raycastGround(e);
      if (groundHit) {
        dragOffset
          .copy(groundHit)
          .sub(new THREE.Vector3(hitUnit.spring.tx, 0, hitUnit.spring.tz));
      }

      if (e.shiftKey) {
        const prev = props.selectedIds();
        if (prev.includes(hitUnit.id)) {
          props.onSelect(prev.filter((id) => id !== hitUnit.id));
        } else {
          props.onSelect([...prev, hitUnit.id]);
        }
      } else {
        props.onSelect([hitUnit.id]);
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || !dragUnit) return;

    const groundHit = raycastGround(e);
    if (!groundHit) return;

    const halfBound = GROUND_SIZE / 2 - 1;
    const nx = Math.max(
      -halfBound,
      Math.min(halfBound, groundHit.x - dragOffset.x),
    );
    const nz = Math.max(
      -halfBound,
      Math.min(halfBound, groundHit.z - dragOffset.z),
    );

    dragUnit.spring.tx = nx;
    dragUnit.spring.tz = nz;
  }

  function handlePointerUp(e: PointerEvent) {
    if (isDragging && dragUnit) {
      controls.enabled = true;
      renderer.domElement.releasePointerCapture(e.pointerId);
      props.onMoveUnit?.(dragUnit.id, dragUnit.spring.tx, dragUnit.spring.tz);
      isDragging = false;
      dragUnit = null;
    }
  }

  function handleClick(e: MouseEvent) {
    if (isDragging) return;
    const hitUnit = raycastUnits(e);
    if (!hitUnit && !e.shiftKey) {
      props.onSelect([]);
    }
  }

  // ── Async unit creation ─────────────────────────────────────────────

  async function createUnit(pu: ColonyUnit, index: number): Promise<InternalUnit> {
    const charClass = pu.characterClass || characterForIndex(index);
    const assetPath = ASSETS.characters[charClass];

    const { scene: model, animations } = await loadModel(assetPath);
    model.scale.setScalar(CHARACTER_SCALE);

    const group = new THREE.Group();
    group.add(model);

    // Invisible hit target for raycasting (character meshes are complex)
    const hitTarget = createHitTarget();
    group.add(hitTarget);

    // Team-colored ring at feet
    const teamRing = createTeamRing(pu.team);
    teamRing.userData.isTeamRing = true;
    group.add(teamRing);

    // Health bar (if provided)
    let healthBar: THREE.Group | undefined;
    if (pu.health != null && pu.maxHealth != null && pu.maxHealth > 0) {
      healthBar = createHealthBar(pu.health, pu.maxHealth);
      healthBar.userData.isHealthBar = true;
      group.add(healthBar);
    }

    group.position.set(pu.x, 0, pu.z);
    scene.add(group);

    // Animation mixer
    const mixer = new THREE.AnimationMixer(model);

    // Try to find idle and walk clips from character animations
    // KayKit characters embed animations; also try shared clips
    const allClips = [...animations, ...(sharedAnimations.idle ? [sharedAnimations.idle] : []), ...(sharedAnimations.walk ? [sharedAnimations.walk] : [])];

    let idleAction: THREE.AnimationAction | undefined;
    let walkAction: THREE.AnimationAction | undefined;

    for (const clip of allClips) {
      const name = clip.name.toLowerCase();
      if (!idleAction && (name.includes("idle") || name.includes("rest"))) {
        idleAction = mixer.clipAction(clip);
      }
      if (!walkAction && (name.includes("walk") || name.includes("run"))) {
        walkAction = mixer.clipAction(clip);
      }
    }

    // Fallback: use first clip as idle if nothing matched
    if (!idleAction && allClips.length > 0) {
      idleAction = mixer.clipAction(allClips[0]);
    }

    if (idleAction) {
      idleAction.play();
    }

    return {
      id: pu.id,
      team: pu.team,
      characterClass: charClass,
      mesh: group,
      hitTarget,
      spring: {
        cx: pu.x, cy: 0, cz: pu.z,
        tx: pu.x, ty: 0, tz: pu.z,
        vx: 0, vy: 0, vz: 0,
      },
      mixer,
      idleAction,
      walkAction,
      isMoving: false,
      healthBar,
    };
  }

  // ── Async resource creation ─────────────────────────────────────────

  async function createResourceNode(res: ColonyResource): Promise<InternalResource> {
    const assetPath = resourceTypeToAsset(res.type, res.amount);
    const { scene: model } = await loadModel(assetPath);

    const group = new THREE.Group();
    model.scale.setScalar(1.5);
    group.add(model);
    group.position.set(res.x, 0, res.z);
    group.userData.resourceId = res.id;
    scene.add(group);

    return {
      id: res.id,
      type: res.type,
      mesh: group,
      amount: res.amount,
      maxAmount: res.maxAmount,
    };
  }

  // ── Mount ───────────────────────────────────────────────────────────

  onMount(async () => {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 60, 120);

    const aspect = containerRef.clientWidth / containerRef.clientHeight;
    const frustum = 28;
    camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      500,
    );

    const tilt = THREE.MathUtils.degToRad(15);
    const camDist = 100;
    camera.position.set(
      0,
      camDist * Math.cos(tilt),
      camDist * Math.sin(tilt),
    );
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    containerRef.appendChild(renderer.domElement);

    // ── Lighting ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const sun = new THREE.DirectionalLight(0xfff5e1, 1.4);
    sun.position.set(25, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb0c4de, 0.3);
    fill.position.set(-15, 20, -10);
    scene.add(fill);

    // Warm point light near center (camp feel)
    const warmLight = new THREE.PointLight(0xffaa44, 0.6, 30);
    warmLight.position.set(0, 3, 0);
    scene.add(warmLight);

    // ── Ground ──────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const gridTexture = createGridTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Controls ────────────────────────────────────────────────────
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = 0.5;
    controls.minZoom = 0.4;
    controls.maxZoom = 3;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    // ── Pointer events ──────────────────────────────────────────────
    const el = renderer.domElement;
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("click", handleClick);

    // ── Start render loop immediately (shows ground while loading) ──
    let elapsed = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      elapsed += dt;
      controls.update();

      // Update animation mixers
      for (const u of internalUnits) {
        u.mixer?.update(dt);

        // Spring-ease positions
        const wasSettled = springSettled(u.spring);
        if (!wasSettled) {
          springUpdate(u.spring, dt);
          u.mesh.position.set(u.spring.cx, u.spring.cy, u.spring.cz);

          // Face movement direction
          const dx = u.spring.tx - u.spring.cx;
          const dz = u.spring.tz - u.spring.cz;
          if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
            u.mesh.rotation.y = Math.atan2(dx, dz);
          }
        }

        // Transition between idle and walk animations
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

        // Billboard health bars to face camera
        if (u.healthBar) {
          u.healthBar.quaternion.copy(camera.quaternion);
        }
      }

      // Resource bobbing
      for (const res of internalResources) {
        res.mesh.position.y = Math.sin(elapsed * 1.2 + res.mesh.position.x * 0.5) * 0.06;
      }

      // Selection glow pulse
      const pulse = 0.35 + Math.sin(elapsed * 3) * 0.15;
      for (const u of internalUnits) {
        if (u.ring) {
          (u.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──────────────────────────────────────────────────────
    let disposed = false;
    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const w = containerRef.clientWidth;
      const h = containerRef.clientHeight;
      if (w === 0 || h === 0) return;
      const a = w / h;
      camera.left = (-frustum * a) / 2;
      camera.right = (frustum * a) / 2;
      camera.top = frustum / 2;
      camera.bottom = -frustum / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(containerRef);

    // ── Preload & spawn assets ──────────────────────────────────────
    onLoadProgress((loaded, total) => {
      setLoadingProgress(Math.round((loaded / Math.max(total, 1)) * 100));
    });

    try {
      // Preload shared animation rigs
      const animResult = await loadModel(ASSETS.animations.general);
      for (const clip of animResult.animations) {
        const name = clip.name.toLowerCase();
        if (name.includes("idle")) sharedAnimations.idle = clip;
        if (name.includes("walk")) sharedAnimations.walk = clip;
        if (name.includes("run")) sharedAnimations.run = clip;
        if (name.includes("interact")) sharedAnimations.interact = clip;
      }

      const movResult = await loadModel(ASSETS.animations.movement);
      for (const clip of movResult.animations) {
        const name = clip.name.toLowerCase();
        if (!sharedAnimations.walk && name.includes("walk")) sharedAnimations.walk = clip;
        if (!sharedAnimations.run && name.includes("run")) sharedAnimations.run = clip;
      }

      // Preload character models needed for current units
      const neededChars = new Set<string>();
      props.units.forEach((pu, i) => {
        const cls = pu.characterClass || characterForIndex(i);
        neededChars.add(ASSETS.characters[cls]);
      });
      await preloadModels([...neededChars]);

      // Spawn units
      const unitPromises = props.units.map((pu, i) => createUnit(pu, i));
      internalUnits = await Promise.all(unitPromises);
      syncSelectionVisuals();

      // Spawn resources if provided
      if (props.resources && props.resources.length > 0) {
        const resPaths = new Set<string>();
        for (const r of props.resources) {
          resPaths.add(resourceTypeToAsset(r.type, r.amount));
        }
        await preloadModels([...resPaths]);

        const resPromises = props.resources.map((r) => createResourceNode(r));
        internalResources = await Promise.all(resPromises);
      } else {
        // Fallback: spawn decorative resource nodes if no server data
        const decorativeResources: ColonyResource[] = [
          { id: "deco-wood", type: "wood", x: -18, z: -12, amount: 10, maxAmount: 20 },
          { id: "deco-stone", type: "stone", x: 15, z: -20, amount: 8, maxAmount: 15 },
          { id: "deco-metal", type: "metal_ore", x: -22, z: 18, amount: 6, maxAmount: 12 },
          { id: "deco-gems", type: "gems", x: 20, z: 15, amount: 4, maxAmount: 10 },
          { id: "deco-food", type: "food", x: -8, z: 25, amount: 12, maxAmount: 20 },
        ];
        const decoResPaths = new Set<string>();
        for (const r of decorativeResources) {
          decoResPaths.add(resourceTypeToAsset(r.type, r.amount));
        }
        await preloadModels([...decoResPaths]);
        const decoPromises = decorativeResources.map((r) => createResourceNode(r));
        internalResources = await Promise.all(decoPromises);
      }

      // Spawn storage building from dungeon assets
      try {
        const { scene: chestModel } = await loadModel(ASSETS.structures.chest_gold);
        chestModel.scale.setScalar(2.0);
        chestModel.position.set(0, 0, 0);
        scene.add(chestModel);

        // Flanking barrels
        const { scene: barrel1 } = await loadModel(ASSETS.structures.barrel_decorated);
        barrel1.scale.setScalar(1.5);
        barrel1.position.set(-2.5, 0, 1);
        scene.add(barrel1);

        const { scene: barrel2 } = await loadModel(ASSETS.structures.barrel);
        barrel2.scale.setScalar(1.5);
        barrel2.position.set(2.5, 0, 1);
        scene.add(barrel2);

        // Team banners
        const { scene: redBanner } = await loadModel(ASSETS.structures.banner_red);
        redBanner.scale.setScalar(1.8);
        redBanner.position.set(-4, 0, -2);
        scene.add(redBanner);

        const { scene: blueBanner } = await loadModel(ASSETS.structures.banner_blue);
        blueBanner.scale.setScalar(1.8);
        blueBanner.position.set(4, 0, -2);
        scene.add(blueBanner);
      } catch (e) {
        console.warn("[ColonyViewport] Failed to load structure assets:", e);
      }

      setAssetsReady(true);
      setLoadingProgress(100);
    } catch (error) {
      console.error("[ColonyViewport] Asset loading failed:", error);
      setAssetsReady(true); // Allow viewport to show even if assets fail
    }

    // ── Cleanup ─────────────────────────────────────────────────────
    onCleanup(() => {
      disposed = true;
      ro.disconnect();
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationId);
      controls.dispose();

      for (const u of internalUnits) {
        u.mixer?.stopAllAction();
        disposeModel(u.mesh);
      }
      for (const r of internalResources) {
        disposeModel(r.mesh);
      }

      gridTexture.dispose();
      sharedAnimations = {};

      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const materials = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          materials.forEach((m) => m?.dispose?.());
        }
      });
      if (containerRef.contains(renderer.domElement)) {
        containerRef.removeChild(renderer.domElement);
      }
    });
  });

  return (
    <div ref={containerRef} class="relative h-full w-full">
      {/* Loading overlay */}
      {!assetsReady() && (
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1a1a2e]/80 backdrop-blur-sm">
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
