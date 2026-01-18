#define SHADER_NAME DISSOLVE_FS
precision mediump float;

// 主纹理 (Sprite 本身的图片)
uniform sampler2D uMainSampler[%count%];
// 噪点纹理 (全局共用，用于定义溶解形状)
uniform sampler2D uNoiseSampler;

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
// outTint.r 存储了生命周期进度 (0.0 ~ 1.0)
varying vec4 outTint;

void main()
{
    // 1. 获取进度 (从红色通道)
    // Phaser 传入的 outTint 已经是归一化到 0.0~1.0 的了
    float progress = outTint.r;

    // 2. 采样主纹理颜色 (假设没被批处理，在 slot 0)
    vec4 mainColor = texture2D(uMainSampler[0], outTexCoord);

    // 3. 采样噪点图亮度
    // 噪点图决定了哪些区域先消失。越黑的地方越先消失。
    float noiseValue = texture2D(uNoiseSampler, outTexCoord).r;

    // 4. 核心溶解逻辑
    // 如果当前像素的噪点值小于进度值，说明这个像素该消失了
    // 使用 smoothstep 做一个极窄的过渡边缘，比直接用 if (noiseValue < progress) discard 更好看
    float edgeWidth = 0.05; // 边缘宽度
    // 当 noiseValue 远大于 progress 时，alpha 为 1
    // 当 noiseValue 接近 progress 时，alpha 迅速变为 0
    float alpha = smoothstep(progress - edgeWidth, progress, noiseValue);

    // 5. (可选) 燃烧边缘效果
    // 在溶解边缘加一个高亮的颜色
    vec3 burnColor = vec3(1.0, 0.4, 0.0); // 橙红色
    // 计算边缘区域：刚好在消失阈值附近的那一圈
    float edgeFactor = (1.0 - alpha) * smoothstep(progress - edgeWidth * 2.0, progress, noiseValue);
    
    // 混合主颜色和燃烧颜色
    vec3 finalRGB = mix(mainColor.rgb, burnColor, edgeFactor * 3.0); // *3.0 增强亮度

    // 6. 输出最终颜色
    // 注意结合原本的 Alpha 和我们计算的溶解 Alpha
    gl_FragColor = vec4(finalRGB, mainColor.a * alpha);
}