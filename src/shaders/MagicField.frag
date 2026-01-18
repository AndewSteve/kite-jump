#define SHADER_NAME MAGIC_FIELD_FS
precision mediump float;

uniform sampler2D uMainSampler[%count%];

uniform float uTime;
uniform float uAlpha;

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint; // r, g, b, a (alpha)

#define PI 3.14159265359

void main()
{
    // ----------------------------------------------------
    // 1. 计算 "本地时间" (Local Time)
    // ----------------------------------------------------
    // outTint.r 是归一化的 0.0 ~ 1.0
    // 我们把它放大 100 倍，作为一个随机的时间偏移秒数
    // 这样每个 Sprite 看起来就不像是同步的了
    float timeOffset = outTint.r * 100.0; 
    
    // 真正的驱动时间 = 全局时间 + 个人偏移
    float localTime = uTime + timeOffset;

    // ----------------------------------------------------
    // 2. 极坐标计算 (使用 localTime)
    // ----------------------------------------------------
    vec2 uv = outTexCoord;
    vec2 centered = uv - 0.5;
    float radius = length(centered) * 2.0;
    float angle = atan(centered.y, centered.x) / (2.0 * PI) + 0.5;

    if (radius > 1.0) {
        discard;
    }

    // 🚨 注意：这里把 uTime 换成了 localTime
    float u = fract(angle + localTime * 0.2); 
    float v = radius; 
    vec2 polarUV = vec2(u, v);

    // ... (采样逻辑保持不变，确保使用 texColor 变量名) ...
    // 🚨 务必把变量名改为 texColor，不要用 texture
    vec4 texColor = texture2D(uMainSampler[0], polarUV);
    
    // ... (遮罩逻辑保持不变) ...
    float innerMask = smoothstep(0.2, 0.4, radius);
    float outerMask = 1.0 - smoothstep(0.8, 1.0, radius);
    float ringMask = innerMask * outerMask;

    float intensity = texColor.r;
    vec3 baseColor = vec3(0.1, 0.8, 1.0);

    // ... (合成逻辑保持不变) ...
    float finalAlpha = intensity * ringMask * uAlpha * outTint.a;
    gl_FragColor = vec4(baseColor * finalAlpha, finalAlpha);
}