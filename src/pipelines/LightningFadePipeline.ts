import Phaser from 'phaser';
import LightningFadeVert from '../shaders/LightningFade.vert?raw';
import LightningFadeFrag from '../shaders/LightningFade.frag?raw';

export default class LightningFadePipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
  private _progress: number = 0;
  private _color = new Phaser.Display.Color(0, 0, 255);

  constructor(game: Phaser.Game) {
    const safeFragShader = LightningFadeFrag.replace(/%count%/gi, '1');
    super({
      game,
      vertShader: LightningFadeVert,
      fragShader: safeFragShader,
    });
  }

  onPreRender() {
    this.set1f('uProgress', this._progress);
    this.set3f('uColor', this._color.redGL, this._color.greenGL, this._color.blueGL);
  }

  public setProgress(value: number) {
    this._progress = Phaser.Math.Clamp(value, 0, 1);
  }

  public setColor(color: number) {
    this._color = Phaser.Display.Color.IntegerToColor(color);
  }
}
