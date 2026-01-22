#define SHADER_NAME THERMAL_VENT_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;

varying vec2 outTexCoord;
varying vec4 outTint; // Phaser 传进来的顶点颜色

void main()
{
    // --- 1. 基础纹理采样 ---
    float scrollSpeed = 0.5;
    float scrollY = fract(outTexCoord.y - uTime * scrollSpeed);
    vec4 texColor = texture2D(uMainSampler, vec2(outTexCoord.x, scrollY));

    // --- 2. 颜色修正 (修复红变蓝) ---
    // Phaser 的 outTint 往往是 BGR 序的，所以我们在这里手动翻转 RGB
    // 注意：千万不要动 Alpha (outTint.a)，只交换 .r 和 .b
    // vec3 correctedTintRGB = outTint.bgr; 
    vec3 correctedTintRGB = outTint.rgb; 
    float tintAlpha = outTint.a;

    // --- 3. 边缘淡出遮罩 ---
    // 你的上下边缘柔化逻辑
    float fadeEdge = smoothstep(0.0, 0.1, outTexCoord.y) * (1.0 - smoothstep(0.8, 1.0, outTexCoord.y));

    // --- 4. 合成最终颜色 ---
    // 纹理颜色 * 修正后的顶点颜色 * 边缘遮罩
    // 先算出这一点的"原始" RGB 和 Alpha
    vec3 finalRGB = texColor.rgb * correctedTintRGB;
    float finalAlpha = texColor.a * tintAlpha * fadeEdge;

    // --- 5. 关键：预乘 Alpha (Premultiplied Alpha) ---
    // Phaser 的混合模式通常需要 RGB 乘以 Alpha
    // 如果不加这一步，淡入淡出时会出现"灰底"或者"突然消失"的现象
    finalRGB *= finalAlpha;

    gl_FragColor = vec4(finalRGB, finalAlpha);
}