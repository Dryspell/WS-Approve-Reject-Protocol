// ThreeJSGraph.tsx
import { onMount, createSignal, Setter, createEffect } from "solid-js";
import Timeline from "./Timeline";
import * as THREE from "three";
import Graph from "graphology";
import {
  addAxesHelper,
  addGridHelpers,
  createSpheresAndIntersections,
  drawEdges,
  initSceneAndControls,
  populateGraphScene,
  updateEdges,
  updateSpheresAndIntersections,
} from "./threeUtils";
import { updateCoordinates } from "./matrixUtils";

interface ThreeJSGraphProps {
  graph: Graph;
  width: number;
  height: number;
  setCoordinates: Setter<{
    [key: string]: [number, number, number];
  }>;
}

export default function ThreeJSGraph(props: ThreeJSGraphProps) {
  let containerRef: HTMLDivElement | undefined;

  // Define signals for scene, camera, and renderer
  const [camera, setCamera] = createSignal<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = createSignal<THREE.WebGLRenderer | null>(null);

  const [hoveredNodeInfo, setHoveredNodeInfo] = createSignal<{
    label: string;
    coordinates: number[];
  } | null>(null);
  const [showGrid, setShowGrid] = createSignal(false);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [timeDirection, setTimeDirection] = createSignal(1); // Control playback speed and direction
  const [currentTransformationIndex, setCurrentTransformationIndex] = createSignal(0);
  const [interpolationFactor, setInterpolationFactor] = createSignal(0);

  const [showSpheres, setShowSpheres] = createSignal(true);
  const [showIntersections, setShowIntersections] = createSignal(true);
  const spheres: THREE.Mesh[] = []; // Array to hold sphere meshes
  const circles: THREE.Mesh[] = []; // Array to hold sphere meshes
  const intersectionPoints: THREE.Mesh[] = []; // Array to hold intersection markers

  const transformations = [
    new THREE.Matrix4().makeRotationY(Math.PI / 4),
    new THREE.Matrix4().makeScale(1.5, 1.5, 1.5),
    new THREE.Matrix4().makeRotationZ(Math.PI / 4),
    new THREE.Matrix4().makeTranslation(1, 0, 0),
  ];

  const initialPositions: THREE.Vector3[] = [];
  const targetPositions: THREE.Vector3[] = [];
  const nodeMeshes: THREE.Mesh[] = [];
  const nodeMeshMap: { [nodeId: string]: THREE.Mesh } = {}; // Map for quick access to node meshes
  const edges: THREE.LineSegments[] = [];

  let animationFrameId: number | null = null;
  let mouse = new THREE.Vector2();
  let raycaster = new THREE.Raycaster();

  const scene = new THREE.Scene();
  const [animate, setAnimate] = createSignal(() => {});

  createEffect(() => {
    if (!containerRef || !spheres.length) return;

    spheres.forEach(sphere => (sphere.visible = showSpheres()));
    updateSpheresAndIntersections(
      scene,
      props.graph,
      nodeMeshMap,
      spheres,
      circles,
      intersectionPoints,
    );
  });
  createEffect(() => {
    if (!containerRef || !(circles.length || intersectionPoints.length)) return;

    circles.forEach(circle => (circle.visible = showIntersections()));
    intersectionPoints.forEach(point => (point.visible = showIntersections()));
    updateSpheresAndIntersections(
      scene,
      props.graph,
      nodeMeshMap,
      spheres,
      circles,
      intersectionPoints,
    );
  });
  scene.rotation.x = -Math.PI / 2; // Rotate the scene so Z-axis is up

  onMount(() => {
    if (!containerRef) return;

    const { renderer, controls, camera } = initSceneAndControls(
      props.width,
      props.height,
      containerRef,
    );
    setRenderer(renderer);
    setCamera(camera);

    addAxesHelper(scene);
    addGridHelpers(showGrid, scene);
    populateGraphScene(
      props.graph,
      initialPositions,
      targetPositions,
      nodeMeshes,
      nodeMeshMap,
      scene,
    );
    props.setCoordinates(updateCoordinates(props.graph, nodeMeshMap));

    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener("mousemove", onMouseMove);

    // Draw edges between nodes using the utility function
    drawEdges(props.graph, nodeMeshMap, scene, edges);
    // Initial setup of spheres and intersection points
    createSpheresAndIntersections(
      props.graph,
      nodeMeshMap,
      scene,
      spheres,
      circles,
      intersectionPoints,
    );

    const animate = () => {
      controls.update();
      
      if (isPlaying()) {
        // Update interpolation factor
        let factor = interpolationFactor() + timeDirection() * 0.02;
        if (factor > 1) factor = 1;
        if (factor < 0) factor = 0;
        setInterpolationFactor(factor);

        // Check if we’ve reached the boundary (1 or 0)
        if (factor === 1 || factor === 0) {
          // Determine the next transformation index based on time direction
          let newIndex = currentTransformationIndex() + (timeDirection() > 0 ? 1 : -1);

          // Stop playback if we’re at the end or beginning
          if (newIndex >= transformations.length || newIndex < 0) {
            setIsPlaying(false);
            // // Set current index to the last valid transformation index
            // setCurrentTransformationIndex(
            //   Math.max(0, Math.min(transformations.length - 1, currentTransformationIndex())),
            // );
            return;
          }

          // Reset interpolation factor only if we haven’t reached the end or beginning
          if (newIndex < transformations.length && newIndex >= 0) {
            setInterpolationFactor(timeDirection() > 0 ? 0 : 1);
          }

          // Move to the next transformation
          setCurrentTransformationIndex(newIndex);

          nodeMeshes.forEach((node, index) => {
            initialPositions[index].copy(node.position);
            targetPositions[index]
              .copy(initialPositions[index])
              .applyMatrix4(transformations[newIndex]);
          });
        }

        nodeMeshes.forEach((node, index) => {
          node.position.lerpVectors(
            initialPositions[index],
            targetPositions[index],
            Math.abs(interpolationFactor()),
          );
        });

        // Update coordinates and edges based on the latest node positions
        props.setCoordinates(updateCoordinates(props.graph, nodeMeshMap));
        updateEdges(props.graph, nodeMeshMap, edges);
        updateSpheresAndIntersections(
          scene,
          props.graph,
          nodeMeshMap,
          spheres,
          circles,
          intersectionPoints,
        );
      }

      // Render hover effect
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        const { label, coordinates } = intersects[0].object.userData;
        setHoveredNodeInfo({ label, coordinates });
      } else {
        setHoveredNodeInfo(null);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    setAnimate(() => animate);
    animate();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      controls.dispose();
    };
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying());
    if (!isPlaying()) {
      setInterpolationFactor(timeDirection() > 0 ? 0 : 1);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      animate()();
    }
  };

  const handleDirectionToggle = () => {
    setTimeDirection(-timeDirection());
    if (isPlaying()) setInterpolationFactor(timeDirection() > 0 ? 0 : 1);
  };

  const handleSpeedChange = (event: Event) => {
    const speed = parseFloat((event.target as HTMLInputElement).value);
    setTimeDirection(Math.sign(timeDirection()) * speed);
  };

  const handleScrub = (
    index: number,
    factor: number,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
  ) => {
    setCurrentTransformationIndex(index);
    setInterpolationFactor(factor);
    setIsPlaying(false);

    // Reset all nodes to their initial positions
    nodeMeshes.forEach((node, nodeIndex) => {
      node.position.copy(initialPositions[nodeIndex]);
    });

    // Apply all transformations up to the current index
    nodeMeshes.forEach((node, nodeIndex) => {
      for (let i = 0; i < index; i++) {
        // Apply each transformation fully for previous steps
        node.position.applyMatrix4(transformations[i]);
      }

      if (index < transformations.length) {
        // For the current step, apply the transformation partially based on factor
        const initialPosition = new THREE.Vector3().copy(node.position);
        const targetPosition = new THREE.Vector3()
          .copy(node.position)
          .applyMatrix4(transformations[index]);

        // Interpolate between the initial and target position based on factor
        node.position.lerpVectors(initialPosition, targetPosition, factor);
      }
    });

    // Update coordinates and edges based on the latest node positions
    props.setCoordinates(updateCoordinates(props.graph, nodeMeshMap));
    updateEdges(props.graph, nodeMeshMap, edges);
    updateSpheresAndIntersections(
      scene,
      props.graph,
      nodeMeshMap,
      spheres,
      circles,
      intersectionPoints,
    );

    renderer.render(scene, camera);
  };

  return (
    <div
      style={{ position: "relative", width: `${props.width}px`, height: `${props.height + 80}px` }}
    >
      <div
        ref={el => (containerRef = el)}
        style={{ width: `${props.width}px`, height: `${props.height}px` }}
      />
      {hoveredNodeInfo() && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            padding: "8px",
            "background-color": "rgba(255, 255, 255, 0.8)",
            "border-radius": "4px",
            "pointer-events": "none",
          }}
        >
          <p>
            <strong>{hoveredNodeInfo()!.label}</strong>
          </p>
          <p>Coordinates: ({hoveredNodeInfo()!.coordinates.join(", ")})</p>
        </div>
      )}
      <Timeline
        transformations={transformations.length}
        currentIndex={currentTransformationIndex}
        interpolationFactor={interpolationFactor}
        scene={scene}
        renderer={renderer()}
        camera={camera()}
        onScrub={handleScrub}
      />
      <div style={{ position: "absolute", top: "10px", right: "10px" }}>
        <label>
          <input
            type="checkbox"
            checked={showGrid()}
            onChange={e => setShowGrid(e.currentTarget.checked)}
          />
          Show Grid
        </label>
        <label style={{ "margin-left": "10px" }}>
          <input
            type="checkbox"
            checked={showSpheres()}
            onChange={e => setShowSpheres(e.currentTarget.checked)}
          />
          Show Spheres
        </label>
        <label style={{ "margin-left": "10px" }}>
          <input
            type="checkbox"
            checked={showIntersections()}
            onChange={e => setShowIntersections(e.currentTarget.checked)}
          />
          Show Intersections
        </label>
        <button onClick={handlePlayPause} style={{ "margin-left": "10px" }}>
          {isPlaying() ? "Pause" : "Play"}
        </button>
        <button onClick={handleDirectionToggle} style={{ "margin-left": "10px" }}>
          {timeDirection() > 0 ? "Reverse" : "Forward"}
        </button>
        <label style={{ "margin-left": "10px" }}>
          Speed:
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={Math.abs(timeDirection())}
            onInput={handleSpeedChange}
            style={{ "margin-left": "5px" }}
          />
        </label>
      </div>
    </div>
  );
}
