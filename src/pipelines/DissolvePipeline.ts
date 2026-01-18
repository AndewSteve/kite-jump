import Phaser from 'phaser';
import DissolveVert from '../shaders/Dissolve.vert?raw';
import DissolveFrag from '../shaders/Dissolve.frag?raw';
import { VFXTextureKeys } from '../config/AssetKeys';

export default class DissolvePipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
    constructor(game: Phaser.Game) {
        // 1. 将 %count% 替换为 1，腾出纹理槽位
        const safeFragShader = DissolveFrag.replace(/%count%/gi, '1');

        super({
            game,
            vertShader: DissolveVert,
            fragShader: safeFragShader
        });
    }

    onBind() {
        // 1. 必须先调用 super，让 Phaser 绑定主 Sprite 纹理到 Slot 0
        super.onBind(); 

        // 2. 获取噪点图的 Frame
        const frame = this.game.textures.getFrame(VFXTextureKeys.VfxNoiseBar);
        if (!frame) return;

        // 3. 获取 WebGLTextureWrapper
        // 在 Phaser 3.60+ 中，真实的 WebGL 纹理被封装在 source.glTexture 中
        // 我们使用 'as any' 来绕过可能的 TS 类型定义滞后问题
        const glTexture = (frame.source as any).glTexture;

        if (glTexture) {
            // 🚨🚨🚨 核心修复 🚨🚨🚨
            // 使用 Pipeline 自身的 bindTexture 方法
            // 参数 1: 纹理包装器 (WebGLTextureWrapper)
            // 参数 2: 纹理单元 ID (这里用 1)
            this.bindTexture(glTexture, 1);

            // 告诉 Shader：uNoiseSampler 去读 1 号槽位
            this.set1i('uNoiseSampler', 1);
        } else {
            // 如果 glTexture 不存在 (说明图片还没被上传到 GPU)
            // 我们可以尝试强制上传 (通过 renderer 的 textureManager)
            // 但通常只要在 PreloadScene 里加载了，Phaser 会在某个时刻自动处理
            // 这里为了安全，如果没准备好就不绑定，只会导致这一帧特效是黑的，不会报错崩溃
            console.warn(`DissolvePipeline: Texture ${VFXTextureKeys.VfxNoiseBar} not ready on GPU.`);
        }
        
        // MultiPipeline 通常会自动重置 activeTexture，这里我们不需要手动 gl.activeTexture(0)
        // 因为 this.bindTexture 内部处理了状态
    }
}