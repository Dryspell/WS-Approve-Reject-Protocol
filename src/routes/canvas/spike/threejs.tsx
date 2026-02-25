import { createSignal, onMount, onCleanup, For, Show, createEffect } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface UnitData {
  id: number;
  mesh: THREE.Mesh;
  team: "red" | "blue" | "unset";
  ring?: THREE.Mesh;
}

const TEAM_COLORS: Record<UnitData["team"], number> = {
  red: 0xd93025,
  blue: 0x1a73e8,
  unset: 0x9e9e9e,
};

const GROUND_SIZE = 80;
const UNIT_COUNT = 20;

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createGridTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#3a3f2b";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
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

function createUnitMesh(team: UnitData["team"]): THREE.Mesh {
  const geo =
    Math.random() > 0.5
      ? new THREE.BoxGeometry(1.2, 1.6, 1.2)
      : new THREE.CylinderGeometry(0.5, 0.7, 1.6, 6);

  const mat = new THREE.MeshStandardMaterial({
    color: TEAM_COLORS[team],
    roughness: 0.6,
    metalness: 0.2,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSelectionRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.9, 1.15, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd600,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  return ring;
}

type ResourceKind = "gem" | "wood" | "stone" | "food" | "metal";

function createResourceMesh(kind: ResourceKind): THREE.Mesh {
  const geoMap: Record<ResourceKind, THREE.BufferGeometry> = {
    gem: new THREE.IcosahedronGeometry(0.7, 0),
    wood: new THREE.ConeGeometry(0.6, 1.8, 5),
    stone: new THREE.BoxGeometry(1.4, 0.8, 1.4),
    food: new THREE.SphereGeometry(0.6, 8, 6),
    metal: new THREE.OctahedronGeometry(0.7, 0),
  };
  const colorMap: Record<ResourceKind, number> = {
    gem: 0x7c4dff,
    wood: 0x4caf50,
    stone: 0x90a4ae,
    food: 0xff9800,
    metal: 0x78909c,
  };

  const mat = new THREE.MeshStandardMaterial({
    color: colorMap[kind],
    roughness: 0.5,
    metalness: kind === "metal" ? 0.8 : 0.15,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geoMap[kind], mat);
  mesh.castShadow = true;
  return mesh;
}

function createStorageMesh(): THREE.Mesh {
  const geo = new THREE.BoxGeometry(3, 2.4, 3);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d6e63,
    roughness: 0.7,
    metalness: 0.1,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default function ThreeJsSpike() {
  let containerRef!: HTMLDivElement;

  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [wireframe, setWireframe] = createSignal(false);
  const [cameraAngle, setCameraAngle] = createSignal({ polar: 0, azimuth: 0, zoom: 1 });
  const [unitStates, setUnitStates] = createSignal<
    { id: number; team: UnitData["team"]; x: number; z: number }[]
  >([]);

  let units: UnitData[] = [];
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let animationId: number;
  let allMeshMaterials: THREE.MeshStandardMaterial[] = [];

  function syncUnitStates() {
    setUnitStates(
      units.map(u => ({
        id: u.id,
        team: u.team,
        x: Math.round(u.mesh.position.x * 10) / 10,
        z: Math.round(u.mesh.position.z * 10) / 10,
      })),
    );
  }

  function updateSelectionVisuals() {
    const ids = selectedIds();
    for (const u of units) {
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

  function setTeam(team: UnitData["team"]) {
    const ids = selectedIds();
    for (const u of units) {
      if (ids.includes(u.id)) {
        u.team = team;
        (u.mesh.material as THREE.MeshStandardMaterial).color.setHex(TEAM_COLORS[team]);
      }
    }
    syncUnitStates();
  }

  function handleClick(e: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const unitMeshes = units.map(u => u.mesh);
    const hits = raycaster.intersectObjects(unitMeshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const hitUnit = units.find(u => u.mesh === hitMesh);
      if (!hitUnit) return;

      if (e.shiftKey) {
        setSelectedIds(prev =>
          prev.includes(hitUnit.id) ? prev.filter(id => id !== hitUnit.id) : [...prev, hitUnit.id],
        );
      } else {
        setSelectedIds([hitUnit.id]);
      }
    } else if (!e.shiftKey) {
      setSelectedIds([]);
    }

    updateSelectionVisuals();
  }

  createEffect(() => {
    const wf = wireframe();
    for (const mat of allMeshMaterials) {
      mat.wireframe = wf;
    }
  });

  onMount(() => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const aspect = containerRef.clientWidth / containerRef.clientHeight;
    const frustum = 30;
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
    camera.position.set(0, camDist * Math.cos(tilt), camDist * Math.sin(tilt));
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xfff5e1, 1.2);
    dir.position.set(20, 40, 15);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -50;
    dir.shadow.camera.right = 50;
    dir.shadow.camera.top = 50;
    dir.shadow.camera.bottom = -50;
    scene.add(dir);

    const fill = new THREE.DirectionalLight(0xb0c4de, 0.3);
    fill.position.set(-15, 20, -10);
    scene.add(fill);

    // Ground
    const gridTex = createGridTexture();
    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Units
    const halfRange = GROUND_SIZE / 2 - 3;
    for (let i = 0; i < UNIT_COUNT; i++) {
      const mesh = createUnitMesh("unset");
      mesh.position.set(randomInRange(-halfRange, halfRange), 0.8, randomInRange(-halfRange, halfRange));
      scene.add(mesh);
      units.push({ id: i + 1, mesh, team: "unset" });
      allMeshMaterials.push(mesh.material as THREE.MeshStandardMaterial);
    }

    // Resources
    const resourceKinds: ResourceKind[] = ["gem", "wood", "stone", "food", "metal"];
    for (const kind of resourceKinds) {
      const mesh = createResourceMesh(kind);
      mesh.position.set(randomInRange(-halfRange, halfRange), kind === "wood" ? 0.9 : 0.6, randomInRange(-halfRange, halfRange));
      scene.add(mesh);
      allMeshMaterials.push(mesh.material as THREE.MeshStandardMaterial);
    }

    // Storage building
    const storage = createStorageMesh();
    storage.position.set(0, 1.2, 0);
    scene.add(storage);
    allMeshMaterials.push(storage.material as THREE.MeshStandardMaterial);

    syncUnitStates();

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = 0.4;
    controls.minZoom = 0.4;
    controls.maxZoom = 3;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.target.set(0, 0, 0);
    controls.update();

    controls.addEventListener("change", () => {
      setCameraAngle({
        polar: Math.round(THREE.MathUtils.radToDeg(controls.getPolarAngle()) * 10) / 10,
        azimuth: Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()) * 10) / 10,
        zoom: Math.round(camera.zoom * 100) / 100,
      });
    });

    renderer.domElement.addEventListener("click", handleClick);

    // Render loop
    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function onResize() {
      const w = containerRef.clientWidth;
      const h = containerRef.clientHeight;
      const a = w / h;
      camera.left = (-frustum * a) / 2;
      camera.right = (frustum * a) / 2;
      camera.top = frustum / 2;
      camera.bottom = -frustum / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    onCleanup(() => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (containerRef.contains(renderer.domElement)) {
        containerRef.removeChild(renderer.domElement);
      }
    });
  });

  const selectedUnits = () => {
    const ids = selectedIds();
    return unitStates().filter(u => ids.includes(u.id));
  };

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <div ref={containerRef} class="flex-1 h-full" />

      <div class="w-[280px] h-full flex flex-col border-l border-zinc-700 bg-zinc-900 text-zinc-100 overflow-y-auto">
        <div class="px-4 py-3 border-b border-zinc-700">
          <h1 class="text-lg font-bold tracking-tight">Spike B: Three.js</h1>
          <p class="text-xs text-zinc-400 mt-0.5">Vanilla Three.js + SolidJS</p>
        </div>

        {/* Camera info */}
        <div class="px-4 py-3 border-b border-zinc-800 text-xs space-y-1">
          <div class="text-zinc-400 uppercase tracking-wide font-semibold text-[10px]">Camera</div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Polar</span>
            <span>{cameraAngle().polar}°</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Azimuth</span>
            <span>{cameraAngle().azimuth}°</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Zoom</span>
            <span>{cameraAngle().zoom}×</span>
          </div>
        </div>

        {/* Controls */}
        <div class="px-4 py-3 border-b border-zinc-800 space-y-2">
          <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={wireframe()}
              onChange={e => setWireframe(e.currentTarget.checked)}
              class="accent-yellow-500"
            />
            Wireframe mode
          </label>
        </div>

        {/* Team buttons */}
        <div class="px-4 py-3 border-b border-zinc-800 space-y-2">
          <div class="text-zinc-400 uppercase tracking-wide font-semibold text-[10px]">
            Assign Team
          </div>
          <div class="flex gap-2">
            <button
              onClick={() => setTeam("red")}
              disabled={selectedIds().length === 0}
              class="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-red-700 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Set Red
            </button>
            <button
              onClick={() => setTeam("blue")}
              disabled={selectedIds().length === 0}
              class="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Set Blue
            </button>
            <button
              onClick={() => setTeam("unset")}
              disabled={selectedIds().length === 0}
              class="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Unset
            </button>
          </div>
        </div>

        {/* Selected units list */}
        <div class="px-4 py-3 flex-1">
          <div class="text-zinc-400 uppercase tracking-wide font-semibold text-[10px] mb-2">
            Selected ({selectedIds().length})
          </div>
          <Show
            when={selectedUnits().length > 0}
            fallback={
              <p class="text-xs text-zinc-600 italic">Click a unit to select. Shift+click for multi.</p>
            }
          >
            <div class="space-y-1.5">
              <For each={selectedUnits()}>
                {unit => (
                  <div class="flex items-center gap-2 text-xs bg-zinc-800 rounded px-2 py-1.5">
                    <div
                      class="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        "background-color":
                          unit.team === "red"
                            ? "#d93025"
                            : unit.team === "blue"
                              ? "#1a73e8"
                              : "#9e9e9e",
                      }}
                    />
                    <span class="font-mono text-zinc-300">#{unit.id}</span>
                    <span class="text-zinc-500 ml-auto font-mono">
                      ({unit.x}, {unit.z})
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Usage hints */}
        <div class="px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-600 space-y-0.5">
          <div>Left-drag: pan · Scroll: zoom</div>
          <div>Right-drag: orbit · Click: select</div>
        </div>
      </div>
    </div>
  );
}
