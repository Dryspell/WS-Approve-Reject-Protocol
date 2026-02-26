import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

// ── Configuration ──────────────────────────────────────────────────────
// Base URL for assets — swap to a CDN origin in production.
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || "/assets";

// ── Shared loader and cache ────────────────────────────────────────────

const manager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(manager);

interface CachedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  isSkinned: boolean;
}

const modelCache = new Map<string, CachedModel>();
const loadingPromises = new Map<string, Promise<CachedModel>>();

// ── Progress tracking ──────────────────────────────────────────────────

export type LoadProgressCallback = (loaded: number, total: number) => void;

let progressCallback: LoadProgressCallback | null = null;

export function onLoadProgress(cb: LoadProgressCallback) {
  progressCallback = cb;
}

manager.onProgress = (_url, loaded, total) => {
  progressCallback?.(loaded, total);
};

manager.onError = (url) => {
  console.error(`[AssetLoader] Failed to load: ${url}`);
};

// ── Core loading ───────────────────────────────────────────────────────

function hasSkeleton(object: THREE.Object3D): boolean {
  let found = false;
  object.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}

function enableShadows(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

async function loadRaw(path: string): Promise<CachedModel> {
  const url = `${ASSET_BASE}/${path}`;

  if (modelCache.has(path)) return modelCache.get(path)!;
  if (loadingPromises.has(path)) return loadingPromises.get(path)!;

  const promise = gltfLoader
    .loadAsync(url)
    .then((gltf) => {
      const skinned = hasSkeleton(gltf.scene);
      enableShadows(gltf.scene);

      const cached: CachedModel = {
        scene: gltf.scene,
        animations: gltf.animations,
        isSkinned: skinned,
      };
      modelCache.set(path, cached);
      loadingPromises.delete(path);
      return cached;
    })
    .catch((err) => {
      loadingPromises.delete(path);
      throw err;
    });

  loadingPromises.set(path, promise);
  return promise;
}

/**
 * Load and clone a model. Skinned meshes (characters with bones) are
 * cloned via `SkeletonUtils.clone` so each instance gets its own
 * skeleton for independent animation.
 */
export async function loadModel(
  path: string,
): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  const cached = await loadRaw(path);
  const scene = cached.isSkinned
    ? (SkeletonUtils.clone(cached.scene) as THREE.Group)
    : cached.scene.clone();
  return { scene, animations: cached.animations };
}

/**
 * Preload a batch of assets concurrently. Returns when all are cached.
 */
export async function preloadModels(paths: string[]): Promise<void> {
  await Promise.all(paths.map((p) => loadRaw(p)));
}

// ── Disposal ───────────────────────────────────────────────────────────

export function disposeModel(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of materials) {
        if (mat && typeof mat.dispose === "function") {
          // Dispose textures on the material
          for (const key of Object.keys(mat) as (keyof THREE.Material)[]) {
            const value = (mat as any)[key];
            if (value instanceof THREE.Texture) {
              value.dispose();
            }
          }
          mat.dispose();
        }
      }
    }
  });
}

export function clearCache() {
  for (const [, cached] of modelCache) {
    disposeModel(cached.scene);
  }
  modelCache.clear();
  loadingPromises.clear();
}

// ── Asset manifest ─────────────────────────────────────────────────────
// Paths are relative to ASSET_BASE. This makes CDN migration trivial:
// set VITE_ASSET_BASE_URL to "https://cdn.example.com/assets".

export const ASSETS = {
  characters: {
    knight: "characters/Knight.glb",
    barbarian: "characters/Barbarian.glb",
    mage: "characters/Mage.glb",
    rogue: "characters/Rogue.glb",
    rogue_hooded: "characters/Rogue_Hooded.glb",
    ranger: "characters/Ranger.glb",
    skeleton_minion: "characters/Skeleton_Minion.glb",
    skeleton_warrior: "characters/Skeleton_Warrior.glb",
    skeleton_mage: "characters/Skeleton_Mage.glb",
    skeleton_rogue: "characters/Skeleton_Rogue.glb",
  },

  animations: {
    general: "animations/Rig_Medium_General.glb",
    movement: "animations/Rig_Medium_MovementBasic.glb",
  },

  equipment: {
    sword_1h: "equipment/sword_1handed.gltf",
    sword_2h: "equipment/sword_2handed.gltf",
    axe_1h: "equipment/axe_1handed.gltf",
    axe_2h: "equipment/axe_2handed.gltf",
    bow: "equipment/bow.gltf",
    bow_string: "equipment/bow_withString.gltf",
    shield: "equipment/shield_round.gltf",
    shield_barbarian: "equipment/shield_round_barbarian.gltf",
    staff: "equipment/staff.gltf",
    wand: "equipment/wand.gltf",
    dagger: "equipment/dagger.gltf",
    quiver: "equipment/quiver.gltf",
  },

  resources: {
    wood_log: "resources/Wood_Log_A.gltf",
    wood_log_b: "resources/Wood_Log_B.gltf",
    wood_stack: "resources/Wood_Log_Stack.gltf",
    wood_planks: "resources/Wood_Planks_Stack_Small.gltf",
    stone_small: "resources/Stone_Chunks_Small.gltf",
    stone_large: "resources/Stone_Chunks_Large.gltf",
    stone_bricks: "resources/Stone_Bricks_Stack_Small.gltf",
    iron_large: "resources/Iron_Nugget_Large.gltf",
    iron_small: "resources/Iron_Nugget_Small.gltf",
    iron_pile: "resources/Iron_Nuggets.gltf",
    gold_large: "resources/Gold_Nugget_Large.gltf",
    gold_pile: "resources/Gold_Nuggets.gltf",
    copper_large: "resources/Copper_Nugget_Large.gltf",
    textiles: "resources/Textiles_A.gltf",
    pallet: "resources/Pallet_Wood.gltf",
  },

  structures: {
    barrel: "structures/barrel_large.gltf",
    barrel_decorated: "structures/barrel_large_decorated.gltf",
    barrel_small: "structures/barrel_small.gltf",
    barrel_stack: "structures/barrel_small_stack.gltf",
    chest: "structures/chest.gltf",
    chest_gold: "structures/chest_gold.gltf",
    banner_red: "structures/banner_red.gltf",
    banner_blue: "structures/banner_blue.gltf",
    candle: "structures/candle_lit.gltf",
    coins_large: "structures/coin_stack_large.gltf",
    coins_medium: "structures/coin_stack_medium.gltf",
    box_large: "structures/box_large.gltf",
    box_small: "structures/box_small.gltf",
    chair: "structures/chair.gltf",
    column: "structures/column.gltf",
  },

  environment: {
    bush_1a: "environment/nature/Bush_1_A_Color1.gltf",
    bush_2a: "environment/nature/Bush_2_A_Color1.gltf",
    rock_1a: "environment/nature/Rock_1_A_Color1.gltf",
    rock_1b: "environment/nature/Rock_1_B_Color1.gltf",
    grass_1a: "environment/nature/Grass_1_A_Color1.gltf",
    grass_1b: "environment/nature/Grass_1_B_Color1.gltf",
    hex_grass: "environment/hex/hex_grass.gltf",
    floor_dirt: "environment/dungeon/floor_dirt_large.gltf",
    floor_dirt_rocky: "environment/dungeon/floor_dirt_large_rocky.gltf",
    block_grass: "environment/blocks/grass.gltf",
    block_dirt_grass: "environment/blocks/dirt_with_grass.gltf",
    block_stone: "environment/blocks/stone.gltf",
  },
} as const;

export type CharacterClass = keyof typeof ASSETS.characters;
export type ResourceAsset = keyof typeof ASSETS.resources;
export type EquipmentAsset = keyof typeof ASSETS.equipment;
export type StructureAsset = keyof typeof ASSETS.structures;

// Resolve a server resource_type to the best matching asset path
export function resourceTypeToAsset(
  type: string,
  amount?: number,
): string {
  const large = !amount || amount > 5;
  const map: Record<string, string> = {
    wood: large ? ASSETS.resources.wood_stack : ASSETS.resources.wood_log,
    stone: large ? ASSETS.resources.stone_large : ASSETS.resources.stone_small,
    metal_ore: large ? ASSETS.resources.iron_pile : ASSETS.resources.iron_small,
    coal: ASSETS.structures.barrel,
    gems: large ? ASSETS.resources.gold_pile : ASSETS.resources.gold_large,
    fiber: ASSETS.resources.textiles,
    hide: ASSETS.resources.textiles,
    sand: ASSETS.resources.stone_small,
    food: ASSETS.structures.barrel_small,
  };
  return map[type] || ASSETS.resources.wood_log;
}

// Character class cycling for assigning varied models to units
const CHARACTER_CLASSES: CharacterClass[] = [
  "knight",
  "barbarian",
  "mage",
  "rogue",
  "ranger",
];

export function characterForIndex(index: number): CharacterClass {
  return CHARACTER_CLASSES[index % CHARACTER_CLASSES.length];
}

// Skeleton variants for minion/laborer units
export type SkeletonClass = "skeleton_minion" | "skeleton_warrior" | "skeleton_mage" | "skeleton_rogue";

const SKELETON_CLASSES: SkeletonClass[] = [
  "skeleton_minion",
  "skeleton_warrior",
  "skeleton_mage",
  "skeleton_rogue",
];

export function skeletonForIndex(index: number): SkeletonClass {
  return SKELETON_CLASSES[index % SKELETON_CLASSES.length];
}
