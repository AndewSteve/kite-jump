import Phaser from 'phaser';

// ✅ 1. 标准 MultiPipeline 顶点着色器 (直接复用 Phaser 3.90 推荐模板)
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

// ✅ 2. 适配 MultiPipeline 的片元着色器
const FogFragShader = `
#define SHADER_NAME FOG_FS

precision mediump float;

uniform sampler2D uMainSampler[%count%];
uniform float uFadeHeight; // 0.0 - 1.0 (Fade takes up how much of the texture height?)

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main()
{
    vec4 texture;

    %forloop%

    vec4 color = texture * outTint;

    // ✅ NEW LOGIC: Fade based on UV (Texture) Coordinates
    // outTexCoord.y goes from 0.0 (Top) to 1.0 (Bottom)
    
    // We want the bottom to be transparent (alpha 0) and top to be opaque (alpha 1)
    // 1.0 - outTexCoord.y flips it: 1.0 (Top) -> 0.0 (Bottom)
    float distanceFromBottom = 1.0 - outTexCoord.y;

    // Calculate Smooth Alpha
    // If distance < uFadeHeight, alpha fades from 0 to 1
    // smoothstep(min, max, value)
    float alphaMask = smoothstep(0.0, uFadeHeight, distanceFromBottom);

    color.a *= alphaMask;

    gl_FragColor = color;
}
`;

export default class FogPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
  constructor(game: Phaser.Game) {
    super({
      game,
      vertShader: FogVertShader, // 必须提供完整的 VertShader
      fragShader: FogFragShader,
      // ❌ 移除 uniforms 属性，Phaser 3.90 会自动解析 shader 字符串获取它们
    });
  }
}