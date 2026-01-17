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
uniform vec2 uResolution; 
uniform float uBottomRatio;
uniform float uSoftness;

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main()
{
    vec4 texture;
    %forloop%

    // 1. 获取基础颜色 (Texture * Tint)
    vec4 baseColor = texture * outTint;

    // 🚨🚨🚨 【核心修复】 🚨🚨🚨
    // 强制进行 Alpha 预乘！
    // 解释：当 outTint.a (Tween Alpha) 变小时，我们必须同时让 RGB 变暗。
    // 否则在 ONE, ONE_MINUS_SRC_ALPHA 混合模式下，低 Alpha 高 RGB 会导致加色发光。
    baseColor.rgb *= outTint.a;

    // 2. 计算屏幕空间的 Y 坐标 (0.0=底, 1.0=顶)
    float screenY = gl_FragCoord.y / uResolution.y;

    // 3. 转换坐标
    float fogBottomY = 1.0 - uBottomRatio;

    // 4. 计算 alpha 遮罩
    float alphaMask = smoothstep(fogBottomY, fogBottomY + uSoftness, screenY);

    // 5. 应用遮罩
    // 注意：这里 RGB 和 A 都要乘遮罩，保持预乘状态
    baseColor.a *= alphaMask;
    baseColor.rgb *= alphaMask; 

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