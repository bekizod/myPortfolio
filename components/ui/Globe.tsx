// components/ui/Globe.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Color, Scene, Fog, PerspectiveCamera, Vector3 } from "three";
import { useThree, Canvas, extend, Object3DNode } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type ThreeGlobe from "three-globe";

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: Object3DNode<ThreeGlobe, any>;
  }
}

// Dynamically import countries data
let countriesData: any = null;
if (typeof window !== "undefined") {
  // Only import on client side
  countriesData = require("@/data/globe.json");
}

// Types
export type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: {
    lat: number;
    lng: number;
  };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
}

// Helper functions
export function hexToRgb(hex: string) {
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function genRandomNumbers(min: number, max: number, count: number) {
  const arr = [];
  while (arr.length < count) {
    const r = Math.floor(Math.random() * (max - min)) + min;
    if (arr.indexOf(r) === -1) arr.push(r);
  }
  return arr;
}

// Main Globe Component
export function Globe({ globeConfig, data }: WorldProps) {
  const [mounted, setMounted] = useState(false);
  const [ThreeGlobeInstance, setThreeGlobeInstance] = useState<any>(null);
  const globeRef = useRef<any>(null);
  const [globeData, setGlobeData] = useState<any[] | null>(null);
  const numbersOfRings = useRef<number[]>([]);

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  // Initialize ThreeGlobe
  useEffect(() => {
    const initGlobe = async () => {
      if (typeof window !== "undefined") {
        const module = await import("three-globe");
        const ThreeGlobe = module.default;
        extend({ ThreeGlobe });
        setThreeGlobeInstance(() => ThreeGlobe);
        setMounted(true);
      }
    };
    initGlobe();
  }, []);

  // Build data
  useEffect(() => {
    if (!data) return;

    const arcs = data;
    let points = [];
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const rgb = hexToRgb(arc.color) as { r: number; g: number; b: number };
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: (t: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${1 - t})`,
        lat: arc.startLat,
        lng: arc.startLng,
      });
      points.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: (t: number) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${1 - t})`,
        lat: arc.endLat,
        lng: arc.endLng,
      });
    }

    const filteredPoints = points.filter(
      (v, i, a) =>
        a.findIndex((v2) =>
          ["lat", "lng"].every(
            (k) => v2[k as "lat" | "lng"] === v[k as "lat" | "lng"],
          ),
        ) === i,
    );

    setGlobeData(filteredPoints);
  }, [data]);

  // Initialize globe
  useEffect(() => {
    if (!globeRef.current || !globeData || !countriesData || !ThreeGlobeInstance)
      return;

    try {
      globeRef.current
        .hexPolygonsData(countriesData.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.7)
        .showAtmosphere(defaultProps.showAtmosphere)
        .atmosphereColor(defaultProps.atmosphereColor)
        .atmosphereAltitude(defaultProps.atmosphereAltitude)
        .hexPolygonColor(() => defaultProps.polygonColor);

      // Set arcs
      globeRef.current
        .arcsData(data)
        .arcStartLat((d: any) => d.startLat * 1)
        .arcStartLng((d: any) => d.startLng * 1)
        .arcEndLat((d: any) => d.endLat * 1)
        .arcEndLng((d: any) => d.endLng * 1)
        .arcColor((e: any) => e.color)
        .arcAltitude((e: any) => e.arcAlt * 1)
        .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)])
        .arcDashLength(defaultProps.arcLength)
        .arcDashInitialGap((e: any) => e.order * 1)
        .arcDashGap(15)
        .arcDashAnimateTime(() => defaultProps.arcTime);

      // Set points
      globeRef.current
        .pointsData(data)
        .pointColor((e: any) => e.color)
        .pointsMerge(true)
        .pointAltitude(0.0)
        .pointRadius(2);

      // Set material
      const globeMaterial = globeRef.current.globeMaterial();
      globeMaterial.color = new Color(globeConfig.globeColor || "#1d072e");
      globeMaterial.emissive = new Color(globeConfig.emissive || "#000000");
      globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity || 0.1;
      globeMaterial.shininess = globeConfig.shininess || 0.9;
    } catch (error) {
      console.error("Error initializing globe:", error);
    }
  }, [globeRef.current, globeData, ThreeGlobeInstance]);

  // Rings animation
  useEffect(() => {
    if (!globeRef.current || !globeData || !data) return;

    const interval = setInterval(() => {
      if (!globeRef.current || !globeData) return;

      const randomIndices = genRandomNumbers(
        0,
        data.length,
        Math.floor((data.length * 4) / 5),
      );
      numbersOfRings.current = randomIndices;

      globeRef.current.ringsData(
        globeData.filter((d, i) => randomIndices.includes(i)),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [globeRef.current, globeData, data]);

  if (!mounted || !ThreeGlobeInstance) {
    return null;
  }

  return <threeGlobe ref={globeRef} />;
}

export function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    if (typeof window !== "undefined") {
      gl.setPixelRatio(window.devicePixelRatio);
      gl.setSize(size.width, size.height);
      gl.setClearColor(0xffaaff, 0);
    }
  }, [gl, size]);

  return null;
}

export function World(props: WorldProps) {
  const { globeConfig } = props;

  // Create scene only on client
  const [scene] = useState(() => {
    if (typeof window !== "undefined") {
      const newScene = new Scene();
      newScene.fog = new Fog(0xffffff, 400, 2000);
      return newScene;
    }
    return null;
  });

  if (!scene || typeof window === "undefined") {
    return null;
  }

  return (
    <Canvas
      scene={scene}
      camera={new PerspectiveCamera(50, aspect, 180, 1800)}
      gl={{ preserveDrawingBuffer: true }}
    >
      <WebGLRendererConfig />
      <ambientLight
        color={globeConfig.ambientLight || "#ffffff"}
        intensity={0.6}
      />
      <directionalLight
        color={globeConfig.directionalLeftLight || "#ffffff"}
        position={new Vector3(-400, 100, 400)}
      />
      <directionalLight
        color={globeConfig.directionalTopLight || "#ffffff"}
        position={new Vector3(-200, 500, 200)}
      />
      <pointLight
        color={globeConfig.pointLight || "#ffffff"}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotateSpeed={globeConfig.autoRotateSpeed || 1}
        autoRotate={globeConfig.autoRotate ?? true}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}

const RING_PROPAGATION_SPEED = 3;
const aspect = 1.2;
const cameraZ = 300;
