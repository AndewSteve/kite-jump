#define SHADER_NAME LIGHTNING_FADE_FS
precision mediump float;

// 1. 移除数组定义
uniform sampler2D uMainSampler; 
uniform float uProgress;
uniform vec3 uColor; // 如果你想在 Shader 里额外叠一层色

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
// Phaser 传入的顶点颜色 (包含了 setAlpha 的值)
varying vec4 outTint; 

void main()
{
    // 2. 直接采样，不需要索引
    vec4 texColor = texture2D(uMainSampler, outTexCoord);

    float softness = 0.05;
    // 计算遮罩：从上到下显露 (或消失)
    float mask = 1.0 - smoothstep(uProgress, uProgress + softness, outTexCoord.y);

    // 3. 计算最终颜色
    // 逻辑：纹理颜色 * 自定义Uniform颜色 * Phaser顶点颜色(outTint)
    vec3 finalRGB = texColor.rgb * uColor * outTint.rgb;
    
    // 4. 计算最终 Alpha
    // 逻辑：纹理Alpha * 遮罩 * Phaser顶点Alpha
    float finalAlpha = texColor.a * mask * outTint.a;

    // 5. 预乘 Alpha (Premultiplied Alpha)
    // 这是 WebGL 混合模式正常的关键，防止黑边或高亮异常
    finalRGB *= finalAlpha;

    gl_FragColor = vec4(finalRGB, finalAlpha);
}