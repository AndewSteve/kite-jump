#define SHADER_NAME THERMAL_VENT_FS
precision mediump float;

uniform sampler2D uMainSampler[%count%];
uniform float uTime; // 由 RenderManager 统一驱动

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main()
{
    // 1. 设置滚动速度 (正数向下滚，负数向上滚)
    // 这里的 0.5 是滚动速率，可以根据需要调整
    float scrollSpeed = 1.0; 
    
    // 2. 计算滚动的 Y 坐标
    // fract() 保证结果永远在 0.0 - 1.0 之间，实现循环
    // 原始 UV.y + (时间 * 速度)
    float scrollY = fract(outTexCoord.y - uTime * scrollSpeed);
    
    // 3. 构造新的 UV 向量
    vec2 scrolledUV = vec2(outTexCoord.x, scrollY);

    // 4. 采样颜色
    vec4 color = texture2D(uMainSampler[0], scrolledUV);

    // 5. 应用 Phaser 标准的 Tint 和 Alpha
    float fadeEdge = smoothstep(0.0, 0.1, outTexCoord.y) * (1.0 - smoothstep(0.9, 1.0, outTexCoord.y));
    
    color.a *= fadeEdge;
    vec4 trueTint = outTint.bgra;
    
    gl_FragColor = color * trueTint;
}