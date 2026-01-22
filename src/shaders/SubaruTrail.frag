#define SHADER_NAME SPRINT_TRAIL_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uSpeed;

varying vec2 outTexCoord;
varying vec4 outTint;

void main()
{
    vec2 uv = outTexCoord;

    // --- 1. 内部拉伸 (UV Stretching) ---
    // 关键点：我们不在外面拉伸 Sprite，而是在 Shader 内部把纹理采样坐标 Y 缩小
    // 比如 * 0.2 意味着我们只采图的 20%，视觉上相当于把贴图拉长了 5 倍！
    // 这样能把短噪点变成长线条
    float textureTiling = 0.2; 
    float scrollY = fract(uv.y * textureTiling - uTime * uSpeed);
    
    vec4 noise = texture2D(uMainSampler, vec2(uv.x, scrollY));

    // --- 2. 极端对比度 (The Magic Step) ---
    // 之前用 smoothstep 可能还不够狠
    // 使用 pow(x, 5.0) 是做光效的必杀技。
    // 它会让 0.5 变成 0.03 (几乎看不见)，但让 0.9 依然是 0.59 (可见)
    // 这能把糊成一团的灰色背景全部“吃掉”，只留下最亮的那几根丝
    float textureVal = pow(noise.r, 5.0); 
    
    // 如果觉得线条太少，就把 5.0 改小 (比如 3.0)
    // 如果觉得太糊，就把 5.0 改大 (比如 8.0)

    // 提亮一下，因为 pow 会把整体变暗
    textureVal *= 3.0; 

    // --- 3. 形状遮罩 ---
    // X轴稍微收窄一点，让它像一束光
    float fadeX = smoothstep(0.0, 0.4, uv.x) * (1.0 - smoothstep(0.6, 1.0, uv.x));
    float fadeY = smoothstep(0.0, 0.2, uv.y) * (1.0 - smoothstep(0.8, 1.0, uv.y));
    float mask = fadeX * fadeY;

    // --- 4. 合成 ---
    vec3 finalRGB = outTint.rgb * textureVal * mask;
    float finalAlpha = textureVal * mask; // Alpha 也要跟上

    gl_FragColor = vec4(finalRGB, finalAlpha);
}