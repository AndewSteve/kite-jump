import Phaser from 'phaser';
import FogPipeline from '../pipelines/FogPipeline';

export const PipelineID = {
  Fog: 'FogPipeline',
} as const;

export default class RenderManager {
  private scene: Phaser.Scene;
  private renderer: Phaser.Renderer.WebGL.WebGLRenderer | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    if (this.scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.renderer = this.scene.game.renderer;
      this.initPipelines();
      this.setupGlobalUniforms();
    }
  }

  private initPipelines() {
    if (!this.renderer) return;

    if (!this.renderer.pipelines.has(PipelineID.Fog)) {
      this.renderer.pipelines.add(PipelineID.Fog, new FogPipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.Fog}`);
    }
  }

  private setupGlobalUniforms() {
    // 这里的 uResolution 监听其实在当前极简 Shader 里已经不需要了
    // 因为我们改成了 UV 坐标系 (0-1)，不再依赖屏幕像素坐标
    // 但保留着也没坏处，以后扩展 Shader 可能用到
  }

  public update(_time: number, _delta: number) {
    // 预留 update 接口
  }
}