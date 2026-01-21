import Phaser from 'phaser';
import FogPipeline from '../pipelines/FogPipeline';
import MagicFieldPipeline from '../pipelines/MagicFieldPipeline';
import DissolvePipeline from '../pipelines/DissolvePipeline';
import ColdnessPipeline from '../pipelines/ColdnessPipeline';
import LightningFadePipeline from '../pipelines/LightningFadePipeline';

export const PipelineID = {
  Fog: 'FogPipeline',
  MagicField: 'MagicField',
  Dissolve: 'Dissolve',
  LightningFade: 'LightningFade',
  Coldness: 'Coldness', // ✅ Add ID
} as const;
export type PipelineKey = typeof PipelineID[keyof typeof PipelineID];

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

    if (!this.renderer.pipelines.has(PipelineID.MagicField)) {
      this.renderer.pipelines.add(PipelineID.MagicField, new MagicFieldPipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.MagicField}`);
    }

    // ✅ 注册 Dissolve Pipeline
    if (!this.renderer.pipelines.has(PipelineID.Dissolve)) {
      this.renderer.pipelines.add(PipelineID.Dissolve, new DissolvePipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.Dissolve}`);
    }

    // ✅ 注册 Coldness Pipeline
    if (!this.renderer.pipelines.has(PipelineID.Coldness)) {
      this.renderer.pipelines.add(PipelineID.Coldness, new ColdnessPipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.Coldness}`);
    }

    // ✅ 注册 LightningFade Pipeline
    if (!this.renderer.pipelines.has(PipelineID.LightningFade)) {
      this.renderer.pipelines.add(PipelineID.LightningFade, new LightningFadePipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.LightningFade}`);
    }
  }

  // ✅ 3. 公开获取 Pipeline 的方法
  // 泛型 T 允许调用者指定返回的具体 Pipeline 类型，获得代码提示
  public getPipeline<T extends Phaser.Renderer.WebGL.WebGLPipeline>(key: string): T | null {
    if (!this.renderer) return null;
    
    // Phaser 的 pipelines.get 返回的是 Pipeline | MultiPipeline 等，这里断言为泛型 T
    return this.renderer.pipelines.get(key) as T;
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

