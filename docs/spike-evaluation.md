# Renderer Spike Evaluation

Navigate to `/canvas/spike/` to access all three spikes, or open each directly:
- `/canvas/spike/canvas` -- Spike A: Vanilla Canvas
- `/canvas/spike/threejs` -- Spike B: Three.js 3D
- `/canvas/spike/pixi` -- Spike C: Pixi.js 2D

## At-a-Glance Comparison

| Criterion | Canvas (A) | Three.js (B) | Pixi.js (C) |
|-----------|-----------|--------------|-------------|
| **Lines of code** | 633 | 504 | 567 |
| **Dependencies added** | 0 | three (~150KB gz) | pixi.js (already in project) |
| **Rendering** | 2D Canvas API | WebGL 3D (orthographic) | WebGL 2D |
| **Art direction** | 2D colored circles | Low-poly 3D shapes | 2D colored circles |
| **Built-in events** | None (manual hit-test) | Raycasting | Full pointer event system |
| **Pan/zoom** | Custom (momentum, focal) | OrbitControls | Custom (zoom-to-cursor) |
| **Drag** | Custom (spring physics) | Not yet implemented | Built-in pointer events |
| **Selection** | Click + box select | Click + shift-click | Click + shift-click |
| **Testability** | Screenshot only | Screenshot only | Screenshot only (but sprites are objects) |

## Evaluation Questions (try each spike and answer)

1. **Feel**: Which drag/pan/zoom feels most natural?
2. **Visual appeal**: Which looks most like a colony builder?
3. **Art direction**: Do you prefer the 2D aesthetic or the low-poly 3D?
4. **Code ownership**: Which codebase do you feel most confident maintaining?
5. **Upgrade path**: Which scales best toward tilemaps, buildings, combat?
6. **Performance**: Any noticeable lag with 20 units?

## Technical Notes

### Canvas (A)
- **Strengths**: Zero deps, full control, spring physics already implemented, momentum pan feels fluid
- **Weaknesses**: All interaction code is manual (hit-testing, cursor management, event delegation). More code needed for every new feature. No built-in sprite/texture system -- everything is procedural drawing.
- **Upgrade path**: Would need custom sprite loading, tilemap renderer, z-sorting, and text rendering. Significant investment for full colony features.

### Three.js (B)
- **Strengths**: 3D depth perception even in top-down view. MeshStandardMaterial gives nice lighting/shading for free. OrbitControls handles pan/zoom out of the box. Massive ecosystem (loaders, post-processing, shadows).
- **Weaknesses**: Largest dependency. 3D adds complexity (cameras, lights, materials). Unit drag not implemented (raycasting for drag is more complex than 2D). Art assets need to be 3D models eventually.
- **Upgrade path**: Natural path to buildings, terrain, and combat. But 3D asset creation is more expensive than 2D sprites. Could use simple procedural geometry for a long time.

### Pixi.js (C)
- **Strengths**: Built-in pointer events per sprite (click, drag, hover). Already a project dependency. WebGL performance with 2D simplicity. Good text rendering. Sprite and texture system built in.
- **Weaknesses**: Less visual depth than Three.js. Would need a viewport plugin for momentum pan/zoom.
- **Upgrade path**: Natural path to tilemaps, sprite animations, particle effects. 2D sprite assets are cheaper to create. Aligns with "top-down 2D" design doc direction.

## Decision -- RESOLVED

**Winner: Three.js (Spike B)**

Chosen for its out-of-the-box visual appeal, low-poly 3D aesthetic, and natural depth perception. The MeshStandardMaterial lighting system provides automatic visual cohesion across all scene elements. AI-generated low-poly 3D assets (via tools like Sloyd.ai and LL3M) are more forgiving of imperfections than 2D sprites.

The Three.js spike has been extracted into a reusable `ColonyViewport` component at `src/components/game/ColonyViewport.tsx` and integrated into the main game VotingInterface. Features added beyond the spike:
- Humanoid unit meshes (cylinder body + sphere head)
- Spring-eased drag-to-move via raycasting
- Selection glow with pulse animation
- Resource node bobbing animation
- ResizeObserver-based responsive sizing
- Signal bridge to SolidJS reactive state
- ACES filmic tone mapping + fog

The spike routes at `/canvas/spike/` remain available for reference.
