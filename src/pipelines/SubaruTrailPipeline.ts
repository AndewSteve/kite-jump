import Phaser from 'phaser';
import SubaruTrailFrag from '../shaders/SubaruTrail.frag?raw';

export default class SubaruTrailPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  private _time = 0;
  
  // 调参建议：
  // amplitude: 0.1 (摆动明显), 0.02 (微颤)
  // speed: 2.0 (快流), 0.5 (慢流)
  private _amplitude = 0.1; 
  private _speed = 1.0;

  constructor(game: Phaser.Game) {
    super({
      game,
      fragShader: SubaruTrailFrag,
      // 显式声明拓扑结构，虽然 Sprite 默认就是这个
      topology: (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer)
        .gl.TRIANGLES 
    });
  }

  onPreRender() {
    this.set1f('uTime', this._time);
    this.set1f('uAmplitude', this._amplitude);
    this.set1f('uSpeed', this._speed);
  }

  public updateTime(time: number) {
    this._time = time * 0.001;
  }
}