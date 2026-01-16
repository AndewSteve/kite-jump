import Phaser from 'phaser';

const FogVertShader = `
precision mediump float;
uniform mat4 uProjectionMatrix;
attribute vec2 inPosition;
attribute vec2 inTexCoord;
attribute float inTexId;
attribute float inTintEffect;
attribute vec4 inTint;
varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;
void main ()
{
    gl_Position = uProjectionMatrix * vec4(inPosition, 1.0, 1.0);
    outTexCoord = inTexCoord;
    outTexId = inTexId;
    outTint = inTint;
    outTintEffect = inTintEffect;
}
`;

const FogFragShader = `
#define SHADER_NAME FOG_FS
precision mediump float;

uniform sampler2D uMainSampler[%count%];
uniform vec2 uResolution; // 需要屏幕分辨率
uniform float uBottomRatio; // 雾气底部在屏幕高度的百分比 (Phaser坐标系, 0=顶)
uniform float uSoftness;    // 渐变软度 (比如 0.2 = 20% 屏幕高度)

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main()
{
    vec4 texture;
    %forloop%

    // 1. 基础颜色 (纹理颜色 * Tint颜色)
    // 假设你的 transi_cloud_alpha.png 是带透明度的 RGBA
    vec4 baseColor = texture * outTint;

    // 2. 计算屏幕空间的 Y 坐标 (0.0=底, 1.0=顶)
    float screenY = gl_FragCoord.y / uResolution.y;

    // 3. 转换 Phaser 的 uBottomRatio 到 WebGL 坐标
    // Phaser: 0在顶, 0.3在上方
    // WebGL: 0在底, 0.7在上方
    // 所以雾的物理底边在 WebGL 的 (1.0 - uBottomRatio) 处
    float fogBottomY = 1.0 - uBottomRatio;

    // 4. 计算 alpha 遮罩
    // 我们希望：
    // 当 y <= fogBottomY 时，alpha = 0 (完全透明)
    // 当 y >= fogBottomY + uSoftness 时，alpha = 1 (完全不透明)
    // smoothstep 会在两个值之间生成平滑的 0->1 曲线 (Sigmoid)
    float alphaMask = smoothstep(fogBottomY, fogBottomY + uSoftness, screenY);

    // 5. 应用遮罩
    baseColor.a *= alphaMask;
    baseColor.rgb *= alphaMask; // 预乘 Alpha

    gl_FragColor = baseColor;
}
`;

export default class FogPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
  constructor(game: Phaser.Game) {
    super({
      game,
      vertShader: FogVertShader,
      fragShader: FogFragShader,
    });
  }
}