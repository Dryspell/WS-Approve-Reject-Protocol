# React Flow Interaction Patterns Study

Extracted from xyflow source code. These patterns are renderer-agnostic.

## 1. Drag System (d3-drag based)

**Key insight**: React Flow uses `d3-drag` for normalized pointer handling across mouse/touch.

### Drag Threshold
Prevents accidental drags. Measures Euclidean distance in screen-space before activating:
```typescript
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance > threshold) startDrag();
```

### Coordinate Transform
All pointer positions are converted from screen-space to world-space using the current viewport transform:
```typescript
function screenToWorld(screenPos, transform) {
  return {
    x: (screenPos.x - transform.x) / transform.zoom,
    y: (screenPos.y - transform.y) / transform.zoom,
  };
}
```

### Snap-to-Grid
Optional grid alignment using Math.round:
```typescript
function snapToGrid(pos, gridSize) {
  return {
    x: gridSize[0] * Math.round(pos.x / gridSize[0]),
    y: gridSize[1] * Math.round(pos.y / gridSize[1]),
  };
}
```

### Auto-Pan on Edge Proximity
When dragging near viewport edges, auto-scrolls using `requestAnimationFrame`:
```typescript
function calcAutoPan(mousePos, bounds, speed = 15) {
  const margin = 25;
  const xMovement = mousePos.x < margin ? -speed : mousePos.x > bounds.width - margin ? speed : 0;
  const yMovement = mousePos.y < margin ? -speed : mousePos.y > bounds.height - margin ? speed : 0;
  return [xMovement, yMovement];
}
```

## 2. Pan/Zoom (d3-zoom based)

React Flow uses `d3-zoom` for viewport transforms with:
- **Focal-point zoom**: Zoom centers on cursor position, not viewport center
- **Smooth transitions**: `d3-transition` for animated zoom/pan changes
- **Constrained extent**: Prevents panning beyond content bounds
- **Pinch-to-zoom**: Native touch support via d3-zoom

### Momentum / Inertia
d3-zoom does NOT provide momentum by default. For our spikes, we implement:
```typescript
class Momentum {
  velocity = { x: 0, y: 0 };
  friction = 0.92;
  
  track(delta) {
    this.velocity = { x: delta.x * 0.4 + this.velocity.x * 0.6, y: delta.y * 0.4 + this.velocity.y * 0.6 };
  }
  
  apply(updateFn) {
    const animate = () => {
      if (Math.abs(this.velocity.x) < 0.1 && Math.abs(this.velocity.y) < 0.1) return;
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;
      updateFn(this.velocity);
      requestAnimationFrame(animate);
    };
    animate();
  }
}
```

## 3. Selection Box (Rubber-band)

```typescript
// On pointer down: record start position
// On pointer move: draw rectangle from start to current
// On pointer up: find all objects within rectangle bounds
function getObjectsInRect(objects, rect) {
  return objects.filter(obj =>
    obj.x >= rect.left && obj.x <= rect.right &&
    obj.y >= rect.top && obj.y <= rect.bottom
  );
}
```
- Shift+click adds to existing selection
- Click on empty space clears selection
- Selection rectangle rendered as dashed border with translucent fill

## 4. Spring Physics (for unit movement)

Not from React Flow directly, but essential for gamified feel.
Critically-damped spring for snappy but organic motion:
```typescript
class Spring {
  target = { x: 0, y: 0 };
  current = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };
  stiffness = 170;
  damping = 26;

  update(dt) {
    const dx = this.target.x - this.current.x;
    const dy = this.target.y - this.current.y;
    const ax = this.stiffness * dx - this.damping * this.velocity.x;
    const ay = this.stiffness * dy - this.damping * this.velocity.y;
    this.velocity.x += ax * dt;
    this.velocity.y += ay * dt;
    this.current.x += this.velocity.x * dt;
    this.current.y += this.velocity.y * dt;
  }
}
```

## 5. Applicable Techniques Summary

| Pattern | Canvas | Three.js | Pixi.js |
|---------|--------|----------|---------|
| Focal-point zoom | Manual transform math | OrbitControls | pixi-viewport plugin |
| Momentum pan | Custom velocity tracking | Custom or controls | pixi-viewport has it |
| Spring movement | Custom Spring class | Custom or tween lib | Custom Spring class |
| Snap-to-grid | Math.round in update | Math.round in update | Math.round in update |
| Selection box | Canvas rect overlay | Raycaster frustum | Graphics rect overlay |
| Auto-pan on edge | requestAnimationFrame | Camera position update | Viewport scroll |
| Drag threshold | Euclidean distance check | Same | Same |
