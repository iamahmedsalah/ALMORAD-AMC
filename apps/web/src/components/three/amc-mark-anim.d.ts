import * as THREE from 'three';

export interface AMCMarkCameraState {
  yaw: number;
  pitch: number;
  dist: number;
  tx: number;
  ty: number;
}

export interface AMCMarkInstance {
  root: THREE.Group;
  pieces: Record<string, THREE.Mesh>;
  size: THREE.Vector3;
  worldC: THREE.Vector3;
  names: string[];
  finish: string;
  materials: Record<string, THREE.Material>;
  update: (p: number, intro: number, time: number, autoSeconds?: number, autoWeight?: number) => void;
  camera: (p: number, intro: number, aspect: number, fov?: number) => AMCMarkCameraState;
  rest: () => void;
  state: () => Array<{ n: string; x: number; y: number; z: number; rz: number; s: number; hx: number; hy: number }>;
  setFinish: (f: string) => void;
  setColors: (navy: string, orange: string) => void;
}

export declare const AMC_SVG: string;

export declare function createAMCMark(options?: { finish?: string; colors?: { navy: string; orange: string } }): AMCMarkInstance;

export declare function bgAt(p: number): THREE.Color;
