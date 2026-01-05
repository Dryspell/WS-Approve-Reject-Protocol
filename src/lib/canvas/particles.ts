// Particle system for visual effects

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  // Create gathering particles (small dots flying from resource to unit)
  createGatherParticles(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    count: number = 8
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 2;
      
      this.particles.push({
        x: fromX,
        y: fromY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 3 + Math.random() * 2,
      });
    }
  }

  // Create crafting particles (sparkles around unit)
  createCraftingParticles(x: number, y: number, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 10;
      
      this.particles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2, // Float upward
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color: "#FFD700", // Gold sparkle
        size: 2 + Math.random() * 2,
      });
    }
  }

  // Create explosion particles (for eliminations)
  createExplosion(x: number, y: number, color: string, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 4;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color,
        size: 4 + Math.random() * 3,
      });
    }
  }

  // Create success particles (for achievements, completions)
  createSuccessParticles(x: number, y: number, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
      const speed = 2 + Math.random() * 3;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50 + Math.random() * 30,
        maxLife: 80,
        color: ["#00ff00", "#00ff88", "#88ff00"][Math.floor(Math.random() * 3)],
        size: 3 + Math.random() * 2,
      });
    }
  }

  // Update all particles
  update(): void {
    this.particles = this.particles.filter((p) => {
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      
      // Apply gravity
      p.vy += 0.1;
      
      // Apply air resistance
      p.vx *= 0.98;
      p.vy *= 0.98;
      
      return p.life > 0;
    });
  }

  // Render all particles
  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Get particle count (for debugging/performance)
  getCount(): number {
    return this.particles.length;
  }

  // Clear all particles
  clear(): void {
    this.particles = [];
  }
}

// Trail system for unit movement
export interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

export class TrailSystem {
  private trails: Map<number, TrailPoint[]> = new Map();
  private maxTrailLength = 20;
  private trailLifetime = 30;

  // Add a trail point for a unit
  addPoint(unitId: number, x: number, y: number): void {
    if (!this.trails.has(unitId)) {
      this.trails.set(unitId, []);
    }

    const trail = this.trails.get(unitId)!;
    trail.push({ x, y, life: this.trailLifetime });

    // Limit trail length
    if (trail.length > this.maxTrailLength) {
      trail.shift();
    }
  }

  // Update all trails (decrease life)
  update(): void {
    this.trails.forEach((trail, unitId) => {
      trail.forEach((point) => point.life--);
      
      // Remove dead points
      const filtered = trail.filter((p) => p.life > 0);
      if (filtered.length === 0) {
        this.trails.delete(unitId);
      } else {
        this.trails.set(unitId, filtered);
      }
    });
  }

  // Render trail for a specific unit
  renderTrail(ctx: CanvasRenderingContext2D, unitId: number, color: string): void {
    const trail = this.trails.get(unitId);
    if (!trail || trail.length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw trail with fading effect
    for (let i = 0; i < trail.length - 1; i++) {
      const p1 = trail[i];
      const p2 = trail[i + 1];
      const alpha = (p1.life / this.trailLifetime) * 0.5;
      
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Clear trail for a unit
  clearTrail(unitId: number): void {
    this.trails.delete(unitId);
  }

  // Clear all trails
  clearAll(): void {
    this.trails.clear();
  }
}

