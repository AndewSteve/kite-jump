import Phaser from 'phaser';
import FogPipeline from '../pipelines/FogPipeline';
import MagicFieldPipeline from '../pipelines/MagicFieldPipeline';
import DissolvePipeline from '../pipelines/DissolvePipeline';
import ColdnessPipeline from '../pipelines/ColdnessPipeline';
import LightningFadePipeline from '../pipelines/LightningFadePipeline';
import ThermalVentPipeline from '../pipelines/ThermalVentPipeline';
import SubaruTrailPipeline from '../pipelines/SubaruTrailPipeline';

export const PipelineID = {
  Fog: 'FogPipeline',
  MagicField: 'MagicField',
  Dissolve: 'Dissolve',
  LightningFade: 'LightningFade',
  Coldness: 'Coldness', // ✅ Add ID
  ThermalVent: 'ThermalVent', // ✅ 新增 ID
  SubaruTrail: 'SubaruTrail', // ✅ 新增 ID
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

    // ✅ 注册 ThermalVent Pipeline
    if (!this.renderer.pipelines.has(PipelineID.ThermalVent)) {
      this.renderer.pipelines.add(PipelineID.ThermalVent, new ThermalVentPipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.ThermalVent}`);
    }

    // ✅ 注册 SubaruTrail Pipeline
    if (!this.renderer.pipelines.has(PipelineID.SubaruTrail)) {
      this.renderer.pipelines.add(PipelineID.SubaruTrail, new SubaruTrailPipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.SubaruTrail}`);
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

  public update(time: number, _delta: number) {
    // ✅ 统一驱动 Pipeline 时间
    // 这样场上所有 ThermalVent 都会同步滚动，性能消耗最小
    const ventPipeline = this.getPipeline<ThermalVentPipeline>(PipelineID.ThermalVent);
    if (ventPipeline) {
        ventPipeline.updateTime(time);
    }
    
    // 如果 ColdnessPipeline 也需要在这里驱动，也可以加上
    const coldPipeline = this.getPipeline<ColdnessPipeline>(PipelineID.Coldness);
    if (coldPipeline) {
        coldPipeline.updateTime(time);
    }

    const trailPipeline = this.getPipeline<SubaruTrailPipeline>(PipelineID.SubaruTrail);
    if (trailPipeline) {
        trailPipeline.updateTime(time);
    }
  }
}

