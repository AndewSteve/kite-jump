import Phaser from 'phaser';
import FogPipeline from '../pipelines/FogPipeline';

// 定义管线 Key 常量，方便外部引用，防止拼写错误
export const PipelineID = {
  Fog: 'FogPipeline',
} as const;

export default class RenderManager {
  private scene: Phaser.Scene;
  private renderer: Phaser.Renderer.WebGL.WebGLRenderer | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // 检查是否运行在 WebGL 模式
    if (this.scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.renderer = this.scene.game.renderer;
      this.initPipelines();
      this.setupGlobalUniforms();
    }
  }

  /**
   * 注册所有自定义管线
   */
  private initPipelines() {
    if (!this.renderer) return;

    // 注册大雾管线
    if (!this.renderer.pipelines.has(PipelineID.Fog)) {
      this.renderer.pipelines.add(PipelineID.Fog, new FogPipeline(this.scene.game));
      console.log(`[RenderManager] Pipeline Registered: ${PipelineID.Fog}`);
    }
  }

  /**
   * 设置全局监听 (例如 Resize)
   */
  private setupGlobalUniforms() {
    if (!this.renderer) return;

    // 监听屏幕大小变化，自动更新所有管线的 uResolution
    this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      // 遍历所有已注册的管线，如果它们有 uResolution，就更新它
      // 这里演示如何更新 FogPipeline
      const fogPipeline = this.renderer?.pipelines.get(PipelineID.Fog) as any; // 强转一下方便访问 set2f
      if (fogPipeline) {
        fogPipeline.set2f('uResolution', gameSize.width, gameSize.height);
      }
    });
  }

  /**
   * 每帧更新 (在 GameScene.update 调用)
   * 用于更新 uTime 等动态参数
   */
  public update(time: number, _delta: number) {
    // 示例：如果你想让 Shader 有时间动效，可以在这里统一推 uTime
    // const fogPipeline = this.renderer?.pipelines.get(PipelineID.Fog) as any;
    // if (fogPipeline) {
    //    fogPipeline.set1f('uTime', time);
    // }
  }
}