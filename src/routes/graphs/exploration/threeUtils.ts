// ThreeJSGraph.tsx
import { createEffect, Accessor } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Graph from "graphology";

export function initSceneAndControls(width: number, height: number, containerRef: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.rotation.x = -Math.PI / 2; // Rotate the scene so Z-axis is up

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(3, 3, 3);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  renderer.setClearColor(new THREE.Color("#f0f0f0"));
  containerRef.appendChild(renderer.domElement);

  // Set up OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  return { scene, renderer, controls, camera };
}

// Function to draw edges between nodes
export function drawEdges(
  graph: Graph,
  nodeMeshMap: { [nodeId: string]: THREE.Mesh },
  scene: THREE.Scene,
  edges: THREE.LineSegments[],
) {
  graph.forEachEdge((edge, attributes, source, target) => {
    const material = new THREE.LineBasicMaterial({ color: attributes.color || "gray" });
    const geometry = new THREE.BufferGeometry();

    const sourceNode = nodeMeshMap[source];
    const targetNode = nodeMeshMap[target];
    geometry.setFromPoints([sourceNode.position, targetNode.position]);

    const line = new THREE.LineSegments(geometry, material);
    edges.push(line);
    scene.add(line);
  });
}

// Function to update edge positions based on the latest node positions
export function updateEdges(
  graph: Graph,
  nodeMeshMap: { [nodeId: string]: THREE.Mesh },
  edges: THREE.LineSegments[],
) {
  graph.forEachEdge((edge, attributes, source, target) => {
    const sourceNode = nodeMeshMap[source];
    const targetNode = nodeMeshMap[target];
    const line = edges[graph.edges().indexOf(edge)];

    const positions = line.geometry.attributes.position.array as Float32Array;
    positions[0] = sourceNode.position.x;
    positions[1] = sourceNode.position.y;
    positions[2] = sourceNode.position.z;
    positions[3] = targetNode.position.x;
    positions[4] = targetNode.position.y;
    positions[5] = targetNode.position.z;

    line.geometry.attributes.position.needsUpdate = true;
  });
}

export function populateGraphScene(
  graph: Graph,
  initialPositions: THREE.Vector3[],
  targetPositions: THREE.Vector3[],
  nodeMeshes: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.Material | THREE.Material[],
    THREE.Object3DEventMap
  >[],
  nodeMeshMap: { [nodeId: string]: THREE.Mesh },
  scene: THREE.Scene,
) {
  graph.forEachNode((node, attr) => {
    const color = new THREE.Color(attr.color || "blue");
    const material = new THREE.MeshBasicMaterial({ color });
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const sphere = new THREE.Mesh(geometry, material);

    const [x, y, z] = attr.coordinates;
    const position = new THREE.Vector3(x, y, z || 0);
    sphere.position.copy(position);
    sphere.userData = { label: attr.label, coordinates: attr.coordinates };

    initialPositions.push(position.clone());
    targetPositions.push(position.clone());
    nodeMeshes.push(sphere);

    // Populate nodeMeshMap with node IDs and their respective meshes
    nodeMeshMap[node] = nodeMeshes[graph.nodes().indexOf(node)];

    scene.add(sphere);
  });

  // Initialize edges
  graph.forEachEdge((edge, attr, source, target) => {
    const sourceNode = graph.getNodeAttributes(source);
    const targetNode = graph.getNodeAttributes(target);

    const sourcePosition = new THREE.Vector3(...sourceNode.coordinates);
    const targetPosition = new THREE.Vector3(...targetNode.coordinates);

    const material = new THREE.LineBasicMaterial({ color: attr.color || 0xffffff });
    const geometry = new THREE.BufferGeometry().setFromPoints([sourcePosition, targetPosition]);

    const line = new THREE.Line(geometry, material);
    scene.add(line);
  });
}

export function addGridHelpers(showGrid: Accessor<boolean>, scene: THREE.Scene) {
  const gridSize = 2;
  const gridDivisions = 10;
  const xGrid = new THREE.GridHelper(gridSize, gridDivisions);
  xGrid.rotation.z = Math.PI / 2;
  xGrid.visible = showGrid();
  scene.add(xGrid);

  const yGrid = new THREE.GridHelper(gridSize, gridDivisions);
  yGrid.rotation.x = Math.PI / 2;
  yGrid.visible = showGrid();
  scene.add(yGrid);

  createEffect(() => {
    xGrid.visible = showGrid();
    yGrid.visible = showGrid();
  });
}

export function addAxesHelper(scene: THREE.Scene) {
  const axesHelper = new THREE.AxesHelper(2);
  scene.add(axesHelper);

  // Add tick marks for each axis using small spheres
  const tickMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const tickGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const tickSpacing = 0.5;
  const tickCount = 5;

  // Add ticks along X-axis
  for (let i = -tickCount; i <= tickCount; i++) {
    if (i === 0) continue; // Skip the origin
    const tick = new THREE.Mesh(tickGeometry, tickMaterial);
    tick.position.set(i * tickSpacing, 0, 0);
    scene.add(tick);
  }

  // Add ticks along Y-axis
  for (let i = -tickCount; i <= tickCount; i++) {
    if (i === 0) continue;
    const tick = new THREE.Mesh(tickGeometry, tickMaterial);
    tick.position.set(0, i * tickSpacing, 0);
    scene.add(tick);
  }

  // Add ticks along Z-axis
  for (let i = -tickCount; i <= tickCount; i++) {
    if (i === 0) continue;
    const tick = new THREE.Mesh(tickGeometry, tickMaterial);
    tick.position.set(0, 0, i * tickSpacing);
    scene.add(tick);
  }
}
