import Phaser from "phaser";

// ✅ 使用 ?raw 导入纯字符串
import FogVertShader from "../shaders/Fog.vert?raw";
import FogFragShader from "../shaders/Fog.frag?raw";

export default class FogPipeline
  extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline
{
  constructor(game: Phaser.Game) {
    super({
      game,
      vertShader: FogVertShader,
      fragShader: FogFragShader,
    });
  }

  // 建议：初始化默认值，防止一开始效果不对
  onBoot() {
    this.set1f("uBottomRatio", 0.5); // 默认雾占一半高度
    this.set1f("uSoftness", 0.2); // 默认边缘柔和度
  }
}
