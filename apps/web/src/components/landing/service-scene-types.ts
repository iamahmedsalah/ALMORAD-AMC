export interface SceneEngine {
  resize(width: number, height: number, dpr: number): void;
  pointer(x: number, y: number, active: boolean): void;
  render(seconds: number): void;
  destroy(): void;
}
