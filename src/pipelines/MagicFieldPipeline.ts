import Phaser from "phaser";

// ✅ 关键：加上 ?raw 后缀，告诉 Vite 把这个文件当成纯字符串读进来
// 这里的路径根据你的实际目录调整
import VertShader from "../shaders/MagicField.vert?raw";
import FragShader from "../shaders/MagicField.frag?raw";

export default class MagicFieldPipeline
  extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline
{
  constructor(game: Phaser.Game) {
    super({
      game,
      vertShader: VertShader, // 直接使用导入的字符串
      fragShader: FragShader, // 直接使用导入的字符串
    });
  }

  // 建议：在这里设置默认值，防止一开始是黑的
  onBoot() {
    this.set1f("uTime", 0);
    this.set1f("uAlpha", 1.0);
  }
}
