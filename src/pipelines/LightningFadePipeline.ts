import Phaser from 'phaser';
import LightningFadeVert from '../shaders/LightningFade.vert?raw';
import LightningFadeFrag from '../shaders/LightningFade.frag?raw';

export default class LightningFadePipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  private _progress: number = 0;
  private _color = new Phaser.Display.Color(255, 255, 255);

  constructor(game: Phaser.Game) {
    super({
      game,
      vertShader: LightningFadeVert,
      fragShader: LightningFadeFrag,
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
