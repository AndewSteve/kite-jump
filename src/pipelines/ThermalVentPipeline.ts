import Phaser from 'phaser';
import ThermalVentFrag from '../shaders/ThermalVent.frag?raw'; // 假设你用 Vite/Webpack 导入

export default class ThermalVentPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
    private _time: number = 0;

    constructor(game: Phaser.Game) {
        super({
            game,
            // 使用 Phaser 默认的 MultiPipeline 顶点着色器即可，不需要自定义 Vert
            fragShader: ThermalVentFrag,
            topology: (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer)
                .gl.TRIANGLES 
        });
    }

    onPreRender() {
        // ✅ 每一帧渲染前，统一更新 Shader 中的 uTime
        this.set1f('uTime', this._time);
    }
    
    /**
     * 由 RenderManager 调用更新内部时间
     * @param time 游戏运行总时间 (ms)
     */
    public updateTime(time: number) {
        // 转换成秒，避免数值过大，同时乘个系数控制全局流速基准
        this._time = time * 0.001; 
    }
}