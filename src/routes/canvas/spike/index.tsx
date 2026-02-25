import { A } from "@solidjs/router";

export default function SpikeIndex() {
  return (
    <div class="flex h-screen flex-col items-center justify-center gap-8 bg-slate-50 p-8">
      <h1 class="text-3xl font-bold text-slate-800">Renderer Spike Comparison</h1>
      <p class="max-w-lg text-center text-slate-500">
        Three proof-of-concept viewports rendering the same test scene. 
        Open each in a separate tab to compare feel, visual quality, and interaction smoothness.
      </p>
      <div class="grid grid-cols-3 gap-6">
        <A
          href="/canvas/spike/canvas"
          class="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-lg"
        >
          <div class="text-5xl">🎨</div>
          <h2 class="text-lg font-bold text-slate-700">Spike A: Canvas</h2>
          <p class="text-center text-sm text-slate-400">
            Vanilla HTML5 Canvas with custom scene graph, spring physics, and momentum pan/zoom. Zero dependencies.
          </p>
          <span class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">0 KB added</span>
        </A>
        <A
          href="/canvas/spike/threejs"
          class="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-lg"
        >
          <div class="text-5xl">🧊</div>
          <h2 class="text-lg font-bold text-slate-700">Spike B: Three.js</h2>
          <p class="text-center text-sm text-slate-400">
            Low-poly 3D top-down scene with OrbitControls, raycasting, and MeshStandardMaterial shading.
          </p>
          <span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">~150 KB gzipped</span>
        </A>
        <A
          href="/canvas/spike/pixi"
          class="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-lg"
        >
          <div class="text-5xl">✨</div>
          <h2 class="text-lg font-bold text-slate-700">Spike C: Pixi.js</h2>
          <p class="text-center text-sm text-slate-400">
            2D WebGL sprites with built-in interaction events, drag-to-move, and smooth zoom-to-cursor.
          </p>
          <span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">~100 KB gzipped</span>
        </A>
      </div>
      <p class="text-xs text-slate-300">Navigate to /canvas/spike/ to see this page</p>
    </div>
  );
}
