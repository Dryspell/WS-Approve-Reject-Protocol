import { onMount } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Graph from "graphology";

interface ThreeJSGraphProps {
  graph: Graph;
  width: number;
  height: number;
}

export default function ThreeJSGraph({ graph, width, height }: ThreeJSGraphProps) {
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (!containerRef) return;

    // Set up the scene
    const scene = new THREE.Scene();
    scene.rotation.x = -Math.PI / 2; // Rotate the scene so Z-axis is up

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(3, 3, 3); // Set initial camera position

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor(new THREE.Color("#f0f0f0")); // Set the background color to light gray
    containerRef.appendChild(renderer.domElement);

    // Set up OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Add AxesHelper to visualize X, Y, Z axes
    const axesHelper = new THREE.AxesHelper(2); // Length of each axis
    scene.add(axesHelper);

    // Create nodes and edges in the scene
    graph.forEachNode((node, attr) => {
      const color = new THREE.Color(attr.color || "blue");
      const material = new THREE.MeshBasicMaterial({ color });
      const geometry = new THREE.SphereGeometry(0.1, 16, 16);
      const sphere = new THREE.Mesh(geometry, material);

      const [x, y, z] = attr.coordinates;
      sphere.position.set(x, y, z || 0); // Use 0 for Z if it is undefined
      scene.add(sphere);
    });

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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Clean up on component unmount
    return () => {
      renderer.dispose();
      controls.dispose();
    };
  });

  return (
    <div ref={el => (containerRef = el)} style={{ width: `${width}px`, height: `${height}px` }} />
  );
}
