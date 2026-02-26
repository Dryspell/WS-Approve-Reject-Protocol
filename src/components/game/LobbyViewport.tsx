import { onMount, onCleanup, createEffect, createSignal, Accessor } from "solid-js";
import * as THREE from "three";
import {
  loadModel,
  preloadModels,
  disposeModel,
  onLoadProgress,
  ASSETS,
  type CharacterClass,
} from "~/lib/asset-loader";

export interface LobbyPlayer {
  id: string;
  name: string;
  character: CharacterClass;
  x: number;
  z: number;
  isReady: boolean;
  isMoving?: boolean;
}

export interface LobbyViewportProps {
  playerName: string;
  playerCharacter?: CharacterClass;
  otherPlayers: LobbyPlayer[];
  onBuildingInteract?: (buildingId: string | null) => void;
  onPlayerClick?: (playerId: string) => void;
  onPositionUpdate?: (x: number, z: number, rotY: number, moving: boolean) => void;
  nearBuilding?: Accessor<string | null>;
}

interface BuildingDef {
  id: string;
  name: string;
  position: THREE.Vector3;
  triggerRadius: number;
  assets: string[];
  scale: number;
  isNear: boolean;
}

interface LobbyCharacter {
  id: string;
  mesh: THREE.Group;
  mixer: THREE.AnimationMixer;
  idleAction?: THREE.AnimationAction;
  walkAction?: THREE.AnimationAction;
  isMoving: boolean;
  nameSprite?: THREE.Sprite;
}

const LOBBY_SIZE = 50;
const CHARACTER_SCALE = 1.6;
const MOVE_SPEED = 10;
const CAMERA_OFFSET = new THREE.Vector3(0, 30, 24);
const CAMERA_LERP = 0.06;

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

function createNameSprite(name: string, isReady: boolean): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);

  ctx.fillStyle = isReady ? "rgba(34,197,94,0.7)" : "rgba(0,0,0,0.6)";
  const textWidth = Math.min(ctx.measureText(name).width + 20, 240);
  ctx.font = "bold 24px sans-serif";
  const measured = ctx.measureText(name).width + 20;
  const rectW = Math.min(measured, 240);
  ctx.beginPath();
  ctx.roundRect((256 - rectW) / 2, 8, rectW, 40, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 128, 28, 230);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 1, 1);
  sprite.position.set(0, 3.2, 0);
  return sprite;
}

function createBuildingLabel(name: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 20px sans-serif";
  const w = ctx.measureText(name).width + 24;
  ctx.beginPath();
  ctx.roundRect((256 - w) / 2, 12, w, 36, 6);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 128, 30, 230);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(5, 1.25, 1);
  sprite.position.set(0, 5, 0);
  return sprite;
}

function createGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base grass/earth color
  ctx.fillStyle = "#2d3a22";
  ctx.fillRect(0, 0, size, size);

  // Procedural noise for organic feel
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 4 + 1;
    const green = 30 + Math.random() * 30;
    const brightness = Math.random() * 15;
    ctx.fillStyle = `rgba(${35 + brightness}, ${green + brightness}, ${20 + brightness}, ${0.15 + Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle path marks near center
  ctx.strokeStyle = "rgba(80, 70, 50, 0.12)";
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export default function LobbyViewport(props: LobbyViewportProps) {
  let containerRef!: HTMLDivElement;

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let clock: THREE.Clock;
  let animationId = 0;

  let playerChar: LobbyCharacter | null = null;
  const otherChars: Map<string, LobbyCharacter> = new Map();
  const otherPlayerTargets: Map<string, { x: number; z: number; rotY: number; isMoving: boolean }> = new Map();
  const buildings: BuildingDef[] = BUILDING_DEFS.map(b => ({ ...b, isNear: false, position: b.position.clone() }));
  const buildingMeshes: THREE.Group[] = [];

  const keys: Record<string, boolean> = {};
  let [loadProgress, setLoadProgress] = createSignal(0);

  let sharedAnimations: { idle?: THREE.AnimationClip; walk?: THREE.AnimationClip } = {};

  async function loadCharacter(
    charClass: CharacterClass,
    name: string,
    isReady: boolean,
    pos: THREE.Vector3,
  ): Promise<LobbyCharacter> {
    const assetPath = ASSETS.characters[charClass];
    const { scene: model, animations } = await loadModel(assetPath);
    model.scale.setScalar(CHARACTER_SCALE);

    const group = new THREE.Group();
    group.add(model);
    group.position.copy(pos);

    const nameSprite = createNameSprite(name, isReady);
    group.add(nameSprite);

    scene.add(group);

    const mixer = new THREE.AnimationMixer(model);
    const allClips = [
      ...animations,
      ...(sharedAnimations.idle ? [sharedAnimations.idle] : []),
      ...(sharedAnimations.walk ? [sharedAnimations.walk] : []),
    ];

    let idleAction: THREE.AnimationAction | undefined;
    let walkAction: THREE.AnimationAction | undefined;
    for (const clip of allClips) {
      const n = clip.name.toLowerCase();
      if (!idleAction && (n.includes("idle") || n.includes("rest"))) idleAction = mixer.clipAction(clip);
      if (!walkAction && (n.includes("walk") || n.includes("run"))) walkAction = mixer.clipAction(clip);
    }
    if (!idleAction && allClips.length > 0) idleAction = mixer.clipAction(allClips[0]);
    idleAction?.play();

    return { id: name, mesh: group, mixer, idleAction, walkAction, isMoving: false, nameSprite };
  }

  onMount(async () => {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a15);
    scene.fog = new THREE.FogExp2(0x1a2a15, 0.018);

    const aspect = containerRef.clientWidth / containerRef.clientHeight;
    camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 200);
    camera.position.set(CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.clientWidth, containerRef.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    containerRef.appendChild(renderer.domElement);

    // Lighting -- warm, atmospheric evening feel
    scene.add(new THREE.AmbientLight(0xccd0b8, 0.35));
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5a1e, 0.3));

    const sun = new THREE.DirectionalLight(0xffecd2, 1.4);
    sun.position.set(15, 35, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x99b3cc, 0.2);
    fill.position.set(-15, 10, -15);
    scene.add(fill);

    // Warm campfire / torch lights near buildings
    for (const b of buildings) {
      const light = new THREE.PointLight(0xff9944, 1.5, 18, 1.5);
      light.position.set(b.position.x, 3, b.position.z);
      scene.add(light);
    }

    // Central gathering light
    const centerLight = new THREE.PointLight(0xffd699, 0.6, 20);
    centerLight.position.set(0, 4, 0);
    scene.add(centerLight);

    // Ground -- organic grass texture
    const groundGeo = new THREE.PlaneGeometry(LOBBY_SIZE, LOBBY_SIZE);
    const groundTex = createGroundTexture();
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Scatter environmental props (rocks, logs) around the edges
    const scatterGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const scatterMat = new THREE.MeshStandardMaterial({ color: 0x6b7a5a, roughness: 0.95 });
    const half = LOBBY_SIZE / 2;
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = half * (0.75 + Math.random() * 0.2);
      const rock = new THREE.Mesh(scatterGeo, scatterMat);
      rock.position.set(
        Math.cos(angle) * radius,
        0.15 + Math.random() * 0.1,
        Math.sin(angle) * radius,
      );
      rock.scale.setScalar(0.5 + Math.random() * 1.2);
      rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, 0);
      scene.add(rock);
    }

    // Fence-post boundary using column-shaped markers
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
        scene.add(post);
      }
    }

    // Keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Animation loop (starts immediately showing the ground)
    let elapsed = 0;
    let disposed = false;
    let lastPositionBroadcast = 0;
    const POSITION_BROADCAST_INTERVAL = 0.1; // seconds

    function animate() {
      if (disposed) return;
      animationId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      elapsed += dt;

      // WASD movement for player
      if (playerChar) {
        const dx = (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0);
        const dz = (keys["s"] || keys["arrowdown"] ? 1 : 0) - (keys["w"] || keys["arrowup"] ? 1 : 0);
        const moving = dx !== 0 || dz !== 0;

        if (moving) {
          const len = Math.sqrt(dx * dx + dz * dz);
          const nx = dx / len;
          const nz = dz / len;
          playerChar.mesh.position.x += nx * MOVE_SPEED * dt;
          playerChar.mesh.position.z += nz * MOVE_SPEED * dt;

          const hBound = LOBBY_SIZE / 2 - 1;
          playerChar.mesh.position.x = Math.max(-hBound, Math.min(hBound, playerChar.mesh.position.x));
          playerChar.mesh.position.z = Math.max(-hBound, Math.min(hBound, playerChar.mesh.position.z));

          playerChar.mesh.rotation.y = Math.atan2(nx, nz);
        }

        if (moving !== playerChar.isMoving) {
          playerChar.isMoving = moving;
          if (moving && playerChar.walkAction) {
            playerChar.walkAction.reset().fadeIn(0.2).play();
            playerChar.idleAction?.fadeOut(0.2);
          } else if (!moving && playerChar.idleAction) {
            playerChar.idleAction.reset().fadeIn(0.2).play();
            playerChar.walkAction?.fadeOut(0.2);
          }
        }

        // Throttled position broadcast to server
        lastPositionBroadcast += dt;
        if (lastPositionBroadcast >= POSITION_BROADCAST_INTERVAL && (moving || lastPositionBroadcast > 1.0)) {
          lastPositionBroadcast = 0;
          props.onPositionUpdate?.(
            playerChar.mesh.position.x,
            playerChar.mesh.position.z,
            playerChar.mesh.rotation.y,
            moving,
          );
        }

        playerChar.mixer.update(dt);

        // Camera follow
        const targetCam = playerChar.mesh.position.clone().add(CAMERA_OFFSET);
        camera.position.lerp(targetCam, CAMERA_LERP);
        camera.lookAt(playerChar.mesh.position);

        // Building proximity detection
        for (const b of buildings) {
          const dist = playerChar.mesh.position.distanceTo(b.position);
          const wasNear = b.isNear;
          b.isNear = dist < b.triggerRadius;
          if (b.isNear && !wasNear) {
            props.onBuildingInteract?.(b.id);
          } else if (!b.isNear && wasNear) {
            const anyNear = buildings.some(bb => bb.isNear);
            if (!anyNear) props.onBuildingInteract?.(null);
          }
        }
      }

      // Update other characters: lerp toward network positions + animate
      for (const [id, char] of otherChars) {
        const target = otherPlayerTargets.get(id);
        if (target) {
          const lerpSpeed = 8 * dt;
          char.mesh.position.x += (target.x - char.mesh.position.x) * lerpSpeed;
          char.mesh.position.z += (target.z - char.mesh.position.z) * lerpSpeed;
          char.mesh.rotation.y += (target.rotY - char.mesh.rotation.y) * lerpSpeed;

          const wasMoving = char.isMoving;
          char.isMoving = target.isMoving;
          if (target.isMoving !== wasMoving) {
            if (target.isMoving && char.walkAction) {
              char.walkAction.reset().fadeIn(0.2).play();
              char.idleAction?.fadeOut(0.2);
            } else if (!target.isMoving && char.idleAction) {
              char.idleAction.reset().fadeIn(0.2).play();
              char.walkAction?.fadeOut(0.2);
            }
          }
        }
        char.mixer.update(dt);
      }

      // Building mesh bobbing
      for (const m of buildingMeshes) {
        m.position.y = Math.sin(elapsed * 0.8 + m.position.x) * 0.05;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize handling
    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const w = containerRef.clientWidth;
      const h = containerRef.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(containerRef);

    // Preload assets and spawn characters
    onLoadProgress((loaded, total) => setLoadProgress(Math.round((loaded / Math.max(total, 1)) * 100)));

    const assetsToPreload = [
      ASSETS.characters[props.playerCharacter || "knight"],
      ASSETS.animations.general,
      ASSETS.animations.movement,
      ...BUILDING_DEFS.flatMap(b => b.assets),
    ];
    await preloadModels(assetsToPreload);

    // Load shared animations from both rigs
    for (const animPath of [ASSETS.animations.general, ASSETS.animations.movement]) {
      try {
        const { animations: clips } = await loadModel(animPath);
        for (const clip of clips) {
          const n = clip.name.toLowerCase();
          if (!sharedAnimations.idle && (n.includes("idle") || n.includes("rest")))
            sharedAnimations.idle = clip;
          if (!sharedAnimations.walk && (n.includes("walk") || n.includes("run")))
            sharedAnimations.walk = clip;
        }
      } catch { /* proceed without this rig */ }
    }

    // Spawn player character
    playerChar = await loadCharacter(
      props.playerCharacter || "knight",
      props.playerName,
      false,
      new THREE.Vector3(0, 0, 0),
    );

    // Spawn buildings with stone platforms and circular prop layout
    for (const b of buildings) {
      const group = new THREE.Group();
      group.position.copy(b.position);

      // Stone platform beneath the building
      const platformGeo = new THREE.CylinderGeometry(3.5, 4, 0.3, 8);
      const platformMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.85 });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = 0.15;
      platform.receiveShadow = true;
      group.add(platform);

      // Arrange props in a circular cluster
      const radius = 1.8;
      for (let i = 0; i < b.assets.length; i++) {
        try {
          const { scene: model } = await loadModel(b.assets[i]);
          model.scale.setScalar(b.scale);
          const angle = (i / b.assets.length) * Math.PI * 2 - Math.PI / 2;
          model.position.set(
            Math.cos(angle) * radius,
            0.3,
            Math.sin(angle) * radius,
          );
          model.rotation.y = -angle + Math.PI;
          model.castShadow = true;
          group.add(model);
        } catch { /* skip failed asset */ }
      }

      const label = createBuildingLabel(b.name);
      group.add(label);

      scene.add(group);
      buildingMeshes.push(group);
    }

    // Spawn other players
    for (const p of props.otherPlayers) {
      try {
        const char = await loadCharacter(
          p.character,
          p.name,
          p.isReady,
          new THREE.Vector3(p.x, 0, p.z),
        );
        char.id = p.id;
        otherChars.set(p.id, char);
      } catch { /* skip failed player */ }
    }

    // Cleanup
    onCleanup(() => {
      disposed = true;
      ro.disconnect();
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      if (playerChar) {
        playerChar.mixer.stopAllAction();
        disposeModel(playerChar.mesh);
      }
      for (const [, c] of otherChars) {
        c.mixer.stopAllAction();
        disposeModel(c.mesh);
      }
      for (const m of buildingMeshes) {
        disposeModel(m);
      }

      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m) => m?.dispose?.());
        }
      });
      if (containerRef.contains(renderer.domElement)) {
        containerRef.removeChild(renderer.domElement);
      }
    });
  });

  // React to player list changes
  createEffect(() => {
    const players = props.otherPlayers;
    if (!playerChar) return;

    const existingIds = new Set(otherChars.keys());
    const newIds = new Set(players.map(p => p.id));

    // Remove departed players
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const c = otherChars.get(id)!;
        c.mixer.stopAllAction();
        disposeModel(c.mesh);
        scene.remove(c.mesh);
        otherChars.delete(id);
        otherPlayerTargets.delete(id);
      }
    }

    // Update positions and ready status for existing players; spawn new ones
    for (const p of players) {
      // Update lerp target positions from network data
      otherPlayerTargets.set(p.id, {
        x: p.x,
        z: p.z,
        rotY: 0,
        isMoving: p.isMoving ?? false,
      });

      const existing = otherChars.get(p.id);
      if (existing) {
        // Update ready status name sprite
        if (existing.nameSprite) {
          existing.mesh.remove(existing.nameSprite);
          (existing.nameSprite.material as THREE.SpriteMaterial).map?.dispose();
          (existing.nameSprite.material as THREE.SpriteMaterial).dispose();
          const newSprite = createNameSprite(p.name, p.isReady);
          existing.mesh.add(newSprite);
          existing.nameSprite = newSprite;
        }
      } else {
        // Spawn new player asynchronously
        loadCharacter(p.character, p.name, p.isReady, new THREE.Vector3(p.x, 0, p.z))
          .then(char => {
            otherChars.set(p.id, char);
          })
          .catch(() => {});
      }
    }
  });

  return (
    <div ref={containerRef!} class="w-full h-full relative" style={{ "touch-action": "none" }}>
      {loadProgress() < 100 && loadProgress() > 0 && (
        <div class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div class="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 text-white text-sm">
            Loading lobby... {loadProgress()}%
          </div>
        </div>
      )}
    </div>
  );
}
