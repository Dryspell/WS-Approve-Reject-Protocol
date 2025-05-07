// ThreeJSGraph.tsx
import { createEffect, Accessor } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Graph from "graphology";

export function initSceneAndControls(width: number, height: number, containerRef: HTMLDivElement) {
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
  return { renderer, controls, camera };
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

// Calculate the intersection of two spheres
function calculateCircleOfIntersection(
  centerA: THREE.Vector3,
  radiusA: number,
  centerB: THREE.Vector3,
  radiusB: number,
): { center: THREE.Vector3; radius: number; normal: THREE.Vector3 } | THREE.Vector3 | null {
  const d = centerA.distanceTo(centerB);

  // No intersection
  if (d > radiusA + radiusB || d < Math.abs(radiusA - radiusB)) {
    return null;
  }

  // Intersection is a single point (spheres are tangent)
  if (d === radiusA + radiusB || d === Math.abs(radiusA - radiusB)) {
    const point = new THREE.Vector3()
      .copy(centerB)
      .sub(centerA)
      .multiplyScalar(radiusA / d)
      .add(centerA);
    return point;
  }

  // Calculate the intersection circle
  const a = (radiusA * radiusA - radiusB * radiusB + d * d) / (2 * d);
  const center = new THREE.Vector3()
    .copy(centerB)
    .sub(centerA)
    .multiplyScalar(a / d)
    .add(centerA);

  const radius = Math.sqrt(radiusA * radiusA - a * a);
  const normal = new THREE.Vector3().subVectors(centerB, centerA).normalize();

  return { center, radius, normal };
}

// Calculate intersection points of two circles in 3D space
function calculateIntersectionOfTwoCircles(
  centerA: THREE.Vector3,
  radiusA: number,
  normalA: THREE.Vector3,
  centerB: THREE.Vector3,
  radiusB: number,
  normalB: THREE.Vector3,
): THREE.Vector3[] | null {
  // Find the line of intersection between the planes of the two circles
  const lineDirection = new THREE.Vector3().crossVectors(normalA, normalB).normalize();

  // If normals are parallel, the circles don’t intersect in 3D space
  if (lineDirection.length() === 0) return null;

  // Project centers of the circles onto the line of intersection
  const projectedCenterA = centerA.clone().projectOnVector(lineDirection);
  const projectedCenterB = centerB.clone().projectOnVector(lineDirection);

  // Calculate the distance between projected centers
  const distance = projectedCenterA.distanceTo(projectedCenterB);

  // Check if circles intersect
  if (distance > radiusA + radiusB || distance < Math.abs(radiusA - radiusB)) return null;

  // Calculate the intersection points on the line
  const a = (radiusA * radiusA - radiusB * radiusB + distance * distance) / (2 * distance);
  const intersectionCenter = new THREE.Vector3()
    .copy(projectedCenterA)
    .add(lineDirection.clone().multiplyScalar(a / distance));

  const h = Math.sqrt(radiusA * radiusA - a * a);
  const perpDirection = new THREE.Vector3().crossVectors(lineDirection, normalA).normalize();

  // Calculate the two intersection points
  const intersection1 = intersectionCenter.clone().add(perpDirection.clone().multiplyScalar(h));
  const intersection2 = intersectionCenter.clone().sub(perpDirection.clone().multiplyScalar(h));

  return [intersection1, intersection2];
}

export function createSpheresAndIntersections(
  graph: Graph,
  nodeMeshMap: { [nodeId: string]: THREE.Mesh },
  scene: THREE.Scene,
  spheres: THREE.Mesh[],
  circles: THREE.Mesh[],
  intersectionPoints: THREE.Mesh[],
) {
  const circleData: { center: THREE.Vector3; radius: number; normal: THREE.Vector3 }[] = [];

  graph.forEachNode(nodeId => {
    const nodeMesh = nodeMeshMap[nodeId];
    const neighbors = Array.from(graph.neighbors(nodeId));

    // Create spheres for each neighbor
    neighbors.forEach(neighborId => {
      const neighborMesh = nodeMeshMap[neighborId];
      const radius = nodeMesh.position.distanceTo(neighborMesh.position);

      // Create a sphere centered at the neighbor with radius equal to the distance
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8888ff,
        wireframe: true,
        opacity: 0.2,
        transparent: true,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(neighborMesh.position);
      spheres.push(sphere);
      scene.add(sphere);
    });

    // Calculate and visualize pairwise circle intersections
    for (let i = 0; i < neighbors.length - 1; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const neighborA = neighbors[i];
        const neighborB = neighbors[j];
        const centerA = nodeMeshMap[neighborA].position;
        const centerB = nodeMeshMap[neighborB].position;
        const radiusA = nodeMesh.position.distanceTo(centerA);
        const radiusB = nodeMesh.position.distanceTo(centerB);

        const circleOrPoint = calculateCircleOfIntersection(centerA, radiusA, centerB, radiusB);
        if (circleOrPoint) {
          if (circleOrPoint instanceof THREE.Vector3) {
            // Handle the single point intersection
            createPoint(scene, circleOrPoint, intersectionPoints);
          } else {
            // Store circle data for later pairwise circle intersection
            circleData.push(circleOrPoint);

            // Visualize the circle
            createCircle(scene, circleOrPoint, circles);
          }
        }
      }
    }

    // Calculate intersection points for circles in triplets (where three spheres intersect)
    for (let i = 0; i < circleData.length - 1; i++) {
      for (let j = i + 1; j < circleData.length; j++) {
        const circleA = circleData[i];
        const circleB = circleData[j];

        const points = calculateIntersectionOfTwoCircles(
          circleA.center,
          circleA.radius,
          circleA.normal,
          circleB.center,
          circleB.radius,
          circleB.normal,
        );

        if (points) {
          points.forEach(point => {
            createPoint(scene, point, intersectionPoints);
          });
        }
      }
    }
  });
}

// Function to update spheres, circles, and intersection points during transformations
export function updateSpheresAndIntersections(
  scene: THREE.Scene,
  graph: Graph,
  nodeMeshMap: { [nodeId: string]: THREE.Mesh },
  spheres: THREE.Mesh[],
  circles: THREE.Mesh[],
  intersectionPoints: THREE.Mesh[],
) {
  let sphereIndex = 0;
  let circleIndex = 0;
  let pointIndex = 0;
  const circleData: { center: THREE.Vector3; radius: number; normal: THREE.Vector3 }[] = [];

  graph.forEachNode(nodeId => {
    const nodeMesh = nodeMeshMap[nodeId];
    const neighbors = Array.from(graph.neighbors(nodeId));

    // Update spheres for each neighbor
    neighbors.forEach(neighborId => {
      const neighborMesh = nodeMeshMap[neighborId];
      const radius = nodeMesh.position.distanceTo(neighborMesh.position);

      const sphere = spheres[sphereIndex];
      sphere.position.copy(neighborMesh.position);
      sphere.geometry.dispose(); // Dispose old geometry
      sphere.geometry = new THREE.SphereGeometry(radius, 32, 32); // Update with new radius
      sphere.visible = true; // Ensure it's visible
      sphereIndex += 1;
    });

    // Calculate and update pairwise circle intersections
    for (let i = 0; i < neighbors.length - 1; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const neighborA = neighbors[i];
        const neighborB = neighbors[j];
        const centerA = nodeMeshMap[neighborA].position;
        const centerB = nodeMeshMap[neighborB].position;
        const radiusA = nodeMesh.position.distanceTo(centerA);
        const radiusB = nodeMesh.position.distanceTo(centerB);

        const circleOrPoint = calculateCircleOfIntersection(centerA, radiusA, centerB, radiusB);
        if (circleOrPoint) {
          if (circleOrPoint instanceof THREE.Vector3) {
            // Handle single point intersection
            const point =
              intersectionPoints[pointIndex] ||
              createPoint(scene, circleOrPoint, intersectionPoints);
            point.position.copy(circleOrPoint);
            point.visible = true;
            intersectionPoints[pointIndex] = point; // Store reference if it's new
            pointIndex += 1;
          } else {
            // Store circle data for further intersections
            circleData.push(circleOrPoint);

            // Update existing circle or create a new one
            const circleMesh = circles[circleIndex] || createCircle(scene, circleOrPoint, circles);
            circleMesh.position.copy(circleOrPoint.center);
            circleMesh.geometry.dispose(); // Dispose old geometry
            circleMesh.geometry = new THREE.RingGeometry(
              circleOrPoint.radius - 0.02,
              circleOrPoint.radius + 0.02,
              64,
            );
            circleMesh.lookAt(circleOrPoint.center.clone().add(circleOrPoint.normal));
            circleMesh.visible = true;
            circles[circleIndex] = circleMesh; // Store reference if it's new
            circleIndex += 1;
          }
        }
      }
    }
  });

  // Calculate pairwise intersections of circles to update intersection points accurately
  for (let i = 0; i < circleData.length - 1; i++) {
    for (let j = i + 1; j < circleData.length; j++) {
      const circleA = circleData[i];
      const circleB = circleData[j];

      const points = calculateIntersectionOfTwoCircles(
        circleA.center,
        circleA.radius,
        circleA.normal,
        circleB.center,
        circleB.radius,
        circleB.normal,
      );

      if (points) {
        points.forEach(point => {
          const intersectionPoint =
            intersectionPoints[pointIndex] || createPoint(scene, point, intersectionPoints);
          intersectionPoint.position.copy(point);
          intersectionPoint.visible = true;
          intersectionPoints[pointIndex] = intersectionPoint; // Store reference if it's new
          pointIndex += 1;
        });
      }
    }
  }

  // Hide any unused spheres, circles, or points from previous frames
  for (let i = sphereIndex; i < spheres.length; i++) spheres[i].visible = false;
  for (let i = circleIndex; i < circles.length; i++) circles[i].visible = false;
  for (let i = pointIndex; i < intersectionPoints.length; i++)
    intersectionPoints[i].visible = false;
}

// Helper function to create a new point for intersections
function createPoint(
  scene: THREE.Scene,
  position: THREE.Vector3,
  intersectionPoints: THREE.Mesh[],
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.05, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const point = new THREE.Mesh(geometry, material);
  point.position.copy(position);
  intersectionPoints.push(point);
  scene.add(point);
  return point;
}

// Helper function to create a new circle mesh for intersections
function createCircle(
  scene: THREE.Scene,
  {
    center,
    radius,
    normal,
  }: {
    center: THREE.Vector3;
    radius: number;
    normal: THREE.Vector3;
  },
  circles: THREE.Mesh[],
): THREE.Mesh {
  const geometry = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    opacity: 0.5,
    transparent: true,
  });
  const circle = new THREE.Mesh(geometry, material);
  circle.position.copy(center);
  circle.lookAt(center.clone().add(normal));

  circles.push(circle);
  scene.add(circle);
  return circle;
}
