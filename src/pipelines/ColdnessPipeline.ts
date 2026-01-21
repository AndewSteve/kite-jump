import Phaser from 'phaser';
import ColdnessVert from '../shaders/Coldness.vert?raw';
import ColdnessFrag from '../shaders/Coldness.frag?raw';
import { UITextureKeys } from '../config/AssetKeys';

export default class ColdnessPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
    private _progress: number = 0;
    private _time: number = 0;

    constructor(game: Phaser.Game) {
        const safeFragShader = ColdnessFrag.replace(/%count%/gi, '1');
        super({
            game,
            vertShader: ColdnessVert,
            fragShader: safeFragShader,
        });
    }

    // 🚨 核心修改：使用 onBind 而不是 onPreRender
    onBind() {
        // 1. 绑定主纹理 (BackIce Sprite 自身的贴图 -> Might)
        super.onBind();

        // 2. 获取副纹理 (Full Ice)
        const fullIceFrame = this.game.textures.getFrame(UITextureKeys.UIColdnessBackIceFull);
        
        if (fullIceFrame) {
            // 获取 WebGL 纹理包装器
            const glTexture = (fullIceFrame.source as any).glTexture;
            
            if (glTexture) {
                // ✅ 绑定到 1 号槽位
                this.bindTexture(glTexture, 1);
                // ✅ 告诉 Shader 去 1 号槽位读
                this.set1i('uFullIceSampler', 1);
            }
        }

        // 3. 更新进度
        this.set1f('uProgress', this._progress);
    }

    onPreRender() {
        // 每帧更新 Uniform
        this.set1f('uProgress', this._progress);
        this.set1f('uTime', this._time);
    }

    /**
     * 设置寒冷值进度
     * @param value 0.0 - 1.0
     */
    public setProgress(value: number) {
        this._progress = Phaser.Math.Clamp(value, 0, 1);
    }
    
    /**
     * 更新时间 (用于波浪动画)
     */
    public updateTime(time: number) {
        this._time = time * 0.001;
    }
}