import { createSignal, onMount, onCleanup, createEffect, Accessor } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ── Public types ────────────────────────────────────────────────────────

export type TeamColor = "red" | "blue" | "unset";

export interface ColonyUnit {
  id: number;
  team: TeamColor;
  x: number;
  z: number;
}

export interface ColonyViewportProps {
  units: ColonyUnit[];
  selectedIds: Accessor<number[]>;
  onSelect: (ids: number[]) => void;
  onMoveUnit?: (id: number, x: number, z: number) => void;
  onSetTeam?: (ids: number[], team: TeamColor) => void;
}

// ── Constants ───────────────────────────────────────────────────────────

const TEAM_HEX: Record<TeamColor, number> = {
  red: 0xd93025,
  blue: 0x1a73e8,
  unset: 0x80868b,
};

const GROUND_SIZE = 80;
const GRID_CELL = 5;

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
  mesh: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  ring?: THREE.Mesh;
  spring: Spring3;
}

// ── Mesh factories ──────────────────────────────────────────────────────

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
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createUnitGroup(team: TeamColor): { group: THREE.Group; body: THREE.Mesh; head: THREE.Mesh } {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.0, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: TEAM_HEX[team],
    roughness: 0.55,
    metalness: 0.15,
    flatShading: true,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfdd9b5,
    roughness: 0.7,
    metalness: 0.05,
    flatShading: true,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.2;
  head.castShadow = true;
  group.add(head);

  return { group, body, head };
}

function createSelectionGlow(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.8, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

type ResourceKind = "gem" | "wood" | "stone" | "food" | "metal";

function createResourceMesh(kind: ResourceKind): THREE.Mesh {
  const geoMap: Record<ResourceKind, THREE.BufferGeometry> = {
    gem: new THREE.IcosahedronGeometry(0.6, 0),
    wood: new THREE.ConeGeometry(0.5, 1.6, 5),
    stone: new THREE.BoxGeometry(1.2, 0.7, 1.2),
    food: new THREE.SphereGeometry(0.5, 8, 6),
    metal: new THREE.OctahedronGeometry(0.6, 0),
  };
  const colorMap: Record<ResourceKind, number> = {
    gem: 0x7c4dff,
    wood: 0x4caf50,
    stone: 0x90a4ae,
    food: 0xff9800,
    metal: 0x607d8b,
  };

  const mat = new THREE.MeshStandardMaterial({
    color: colorMap[kind],
    roughness: 0.5,
    metalness: kind === "metal" ? 0.7 : 0.1,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geoMap[kind], mat);
  mesh.castShadow = true;
  mesh.userData.resourceKind = kind;
  return mesh;
}

function createStorageMesh(): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8, metalness: 0.05, flatShading: true }),
  );
  base.position.y = 0.9;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 1.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7, metalness: 0.05, flatShading: true }),
  );
  roof.position.y = 2.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

// ── Component ───────────────────────────────────────────────────────────

export default function ColonyViewport(props: ColonyViewportProps) {
  let containerRef!: HTMLDivElement;

  let internalUnits: InternalUnit[] = [];
  let resourceMeshes: THREE.Mesh[] = [];
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let animationId: number;
  let clock: THREE.Clock;
  let groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Drag state
  let isDragging = false;
  let dragUnit: InternalUnit | null = null;
  let dragOffset = new THREE.Vector3();

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
    const meshes = internalUnits.map(u => u.body);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    return internalUnits.find(u => u.body === hits[0].object) ?? null;
  }

  function raycastGround(e: MouseEvent): THREE.Vector3 | null {
    getMouseNDC(e);
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(groundPlane, target);
    return hit;
  }

  // ── Selection visuals ───────────────────────────────────────────────

  function syncSelectionVisuals() {
    const ids = props.selectedIds();
    for (const u of internalUnits) {
      const isSelected = ids.includes(u.id);
      if (isSelected && !u.ring) {
        const ring = createSelectionGlow();
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
      const iu = internalUnits.find(u => u.id === pu.id);
      if (iu && iu.team !== pu.team) {
        iu.team = pu.team;
        (iu.body.material as THREE.MeshStandardMaterial).color.setHex(TEAM_HEX[pu.team]);
      }
    }
  });

  createEffect(() => {
    props.selectedIds();
    syncSelectionVisuals();
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
        dragOffset.copy(groundHit).sub(new THREE.Vector3(hitUnit.spring.tx, 0, hitUnit.spring.tz));
      }

      if (e.shiftKey) {
        const prev = props.selectedIds();
        if (prev.includes(hitUnit.id)) {
          props.onSelect(prev.filter(id => id !== hitUnit.id));
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
    const nx = Math.max(-halfBound, Math.min(halfBound, groundHit.x - dragOffset.x));
    const nz = Math.max(-halfBound, Math.min(halfBound, groundHit.z - dragOffset.z));

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

  // ── Mount ───────────────────────────────────────────────────────────

  onMount(() => {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 60, 120);

    const aspect = containerRef.clientWidth / containerRef.clientHeight;
    const frustum = 28;
    camera = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2, (frustum * aspect) / 2,
      frustum / 2, -frustum / 2, 0.1, 500,
    );

    const tilt = THREE.MathUtils.degToRad(15);
    const camDist = 100;
    camera.position.set(0, camDist * Math.cos(tilt), camDist * Math.sin(tilt));
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    containerRef.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const sun = new THREE.DirectionalLight(0xfff5e1, 1.3);
    sun.position.set(25, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    scene.add(new THREE.DirectionalLight(0xb0c4de, 0.25).translateX(-15).translateY(20).translateZ(-10));

    // Ground
    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      map: createGridTexture(),
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Resources
    const resourceKinds: ResourceKind[] = ["gem", "wood", "stone", "food", "metal"];
    const halfRange = GROUND_SIZE / 2 - 5;
    for (const kind of resourceKinds) {
      const mesh = createResourceMesh(kind);
      mesh.position.set(
        (Math.random() - 0.5) * halfRange * 2,
        kind === "wood" ? 0.8 : 0.5,
        (Math.random() - 0.5) * halfRange * 2,
      );
      scene.add(mesh);
      resourceMeshes.push(mesh);
    }

    // Storage
    const storage = createStorageMesh();
    storage.position.set(0, 0, 0);
    scene.add(storage);

    // Units from props
    for (const pu of props.units) {
      const { group, body, head } = createUnitGroup(pu.team);
      group.position.set(pu.x, 0, pu.z);
      scene.add(group);

      internalUnits.push({
        id: pu.id,
        team: pu.team,
        mesh: group,
        body,
        head,
        spring: { cx: pu.x, cy: 0, cz: pu.z, tx: pu.x, ty: 0, tz: pu.z, vx: 0, vy: 0, vz: 0 },
      });
    }

    syncSelectionVisuals();

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = 0.5;
    controls.minZoom = 0.4;
    controls.maxZoom = 3;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    // Pointer events
    const el = renderer.domElement;
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("click", handleClick);

    // Render loop
    let elapsed = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      elapsed += dt;
      controls.update();

      // Spring-ease unit positions
      for (const u of internalUnits) {
        if (!springSettled(u.spring)) {
          springUpdate(u.spring, dt);
          u.mesh.position.set(u.spring.cx, u.spring.cy, u.spring.cz);
        }
      }

      // Resource bobbing
      for (const rm of resourceMeshes) {
        const baseY = rm.userData.resourceKind === "wood" ? 0.8 : 0.5;
        rm.position.y = baseY + Math.sin(elapsed * 1.5 + rm.position.x) * 0.08;
        rm.rotation.y += dt * 0.3;
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

    // Resize
    const ro = new ResizeObserver(() => {
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

    onCleanup(() => {
      ro.disconnect();
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      if (containerRef.contains(renderer.domElement)) {
        containerRef.removeChild(renderer.domElement);
      }
    });
  });

  return <div ref={containerRef} class="h-full w-full" />;
}
