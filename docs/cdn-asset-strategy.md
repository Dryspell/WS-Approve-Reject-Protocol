# CDN Asset Hosting Strategy

This document outlines how the project's 3D assets (KayKit character models, equipment, resources, structures) are loaded and how to migrate them to a CDN when the time comes.

## Current Architecture

All asset loading flows through a single configurable base URL in `src/lib/asset-loader.ts`:

```typescript
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || "/assets";
```

Every model path in the `ASSETS` manifest is relative to this base. For example, `ASSETS.characters.knight` resolves to `"characters/Knight.glb"`, and `loadModel()` fetches `${ASSET_BASE}/characters/Knight.glb`.

**Today**: Assets live in `public/assets/` and are served by the Vite dev server or the production static file server. Total size: ~3.4MB.

**Tomorrow**: Set `VITE_ASSET_BASE_URL` to a CDN origin and the entire app switches over with zero code changes.

## Asset Inventory

| Category | Files | Total Size | Format |
|----------|-------|-----------|--------|
| Characters | 6 GLB | ~1.5MB | Knight, Barbarian, Mage, Rogue, Ranger, Rogue_Hooded |
| Animations | 2 GLB | ~788KB | General (idle, hit, death), Movement (walk, run, jump) |
| Equipment | 12 GLTF+BIN | ~212KB | Swords, axes, bows, shields, staff, wand, dagger, quiver |
| Resources | 15 GLTF+BIN | ~416KB | Wood, stone, iron, gold, copper, textiles, pallets |
| Structures | 15 GLTF+BIN | ~352KB | Barrels, chests, banners, candles, coins, boxes, columns |
| Textures | 7 PNG | ~100KB | Character textures, dungeon texture |

Total: ~3.4MB across ~57 files.

## When to Move to a CDN

Self-hosting from `public/` is adequate while total assets remain under ~20MB. Consider a dedicated CDN when:

- Total assets grow beyond 20-30MB (more characters, full animation sets, building models, terrain tiles)
- Multiple deployment targets need a shared asset origin
- You want to serve different quality tiers based on device capability
- Cache-busting via content-hashed filenames becomes important
- Global latency matters (players in different regions)

## CDN Provider Options

### Cloudflare R2 + Workers (Recommended)

- **No egress fees** -- the standout advantage for game assets
- S3-compatible API for uploads
- Custom domain support via Cloudflare DNS
- Built-in caching at 300+ edge locations
- Free tier: 10GB storage, 10M read requests/month

**Setup**:
1. Create an R2 bucket
2. Upload `public/assets/` contents to the bucket
3. Bind a custom subdomain (e.g., `assets.socketsignals.com`)
4. Set `VITE_ASSET_BASE_URL=https://assets.socketsignals.com`

### AWS CloudFront + S3

- Industry standard, mature tooling
- Fine-grained cache control and invalidation
- More expensive egress ($0.085/GB)
- Best if already on AWS

### Bunny CDN

- Very affordable ($0.01/GB for most regions)
- Simple dashboard, quick setup
- Storage zones with automatic replication
- Good for small-to-mid projects

### Vercel / Netlify Edge

- If deploying the SolidStart app to Vercel or Netlify, files in `public/` are already served from their global edge CDN automatically
- Zero additional config needed
- This may already be "good enough" without a separate CDN

## Migration Steps

### 1. Upload assets to CDN

```bash
# Example with Cloudflare R2 (using rclone)
rclone sync public/assets/ r2:socketsignals-assets/

# Example with AWS S3
aws s3 sync public/assets/ s3://socketsignals-assets/ --cache-control "public, max-age=31536000, immutable"
```

### 2. Set the environment variable

```bash
# .env.production
VITE_ASSET_BASE_URL=https://assets.socketsignals.com
```

### 3. Verify CORS headers

The CDN must return proper CORS headers for Three.js to load assets cross-origin:

```
Access-Control-Allow-Origin: https://socketsignals.com
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Range
```

R2 and S3 both support CORS configuration on the bucket level.

### 4. Optional: Remove assets from public/

Once the CDN is serving reliably, you can remove `public/assets/` from the repo to reduce clone size. The dev server would need `VITE_ASSET_BASE_URL` set to the CDN even in development, or you keep a local copy for offline dev.

## Optimization Opportunities

### Draco Compression

KayKit GLBs are uncompressed. Running them through Draco encoding can reduce sizes by 50-70%:

```bash
npx gltf-transform draco public/assets/characters/Knight.glb public/assets/characters/Knight.glb
```

Three.js has a built-in `DRACOLoader` that decompresses on the GPU. To enable:

```typescript
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
gltfLoader.setDRACOLoader(dracoLoader);
```

This uses Google's hosted Draco decoder WASM, so no additional files to serve.

### KTX2 Texture Compression

Converting PNG textures to KTX2 (Basis Universal) format enables GPU-compressed textures:

```bash
npx gltf-transform ktx2 input.glb output.glb --slots "baseColor"
```

Benefits:
- 4-6x smaller than PNG in VRAM
- Decompresses directly on the GPU (no CPU decode step)
- Particularly impactful on mobile devices

Requires `KTX2Loader` in Three.js:

```typescript
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath("https://cdn.jsdelivr.net/npm/three/examples/jsm/libs/basis/");
gltfLoader.setKTX2Loader(ktx2Loader);
```

### Asset Versioning

When updating models on the CDN, use one of these cache-busting strategies:

1. **Content-hashed filenames**: `Knight.a3f2b1.glb` -- guarantees cache freshness, requires updating the manifest
2. **Versioned directories**: `/assets/v2/characters/Knight.glb` -- simpler, coarser-grained
3. **Cache invalidation**: Purge CDN cache on deploy -- simplest but risks stale caches at edges

### Lazy Loading by Scene

The asset loader already supports selective preloading:

```typescript
// Only load characters that are actually in the current room
const neededChars = new Set(roomUnits.map(u => ASSETS.characters[u.characterClass]));
await preloadModels([...neededChars]);
```

This means a room with 3 Knights and 2 Mages only downloads those 2 models, not all 6 character files.

### Quality Tiers

For mobile/low-end devices, consider serving lower-poly variants:

```
/assets/high/characters/Knight.glb   (474KB, full detail)
/assets/low/characters/Knight.glb    (150KB, reduced geometry)
```

Detect device capability and adjust `VITE_ASSET_BASE_URL` or add a quality suffix to the manifest.

## CI/CD Integration

When ready, add an asset upload step to the deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Upload assets to CDN
  run: |
    rclone sync public/assets/ r2:socketsignals-assets/
  env:
    RCLONE_CONFIG_R2_TYPE: s3
    RCLONE_CONFIG_R2_PROVIDER: Cloudflare
    RCLONE_CONFIG_R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY }}
    RCLONE_CONFIG_R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_KEY }}
    RCLONE_CONFIG_R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
```

## Summary

The asset loading system is CDN-ready today. The migration path is:

1. Choose a provider (Cloudflare R2 recommended)
2. Upload `public/assets/` to the bucket
3. Set `VITE_ASSET_BASE_URL` in production env
4. Configure CORS
5. Optionally apply Draco/KTX2 compression for further savings
