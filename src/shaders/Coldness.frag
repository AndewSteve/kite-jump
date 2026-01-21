#define SHADER_NAME COLDNESS_FS
precision mediump float;

// Slot 0: 主纹理 (ui_coldness_frame_back_ice_might) - 较完整的冰
uniform sampler2D uMainSampler[%count%];
// Slot 1: 副纹理 (ui_coldness_frame_back_ice_full) - 碎裂的冰
uniform sampler2D uFullIceSampler;

uniform float uProgress; // 0.0 - 1.0

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main()
{
    // 1. 采样两张贴图
    vec4 colorMight = texture2D(uMainSampler[0], outTexCoord);
    vec4 colorFull  = texture2D(uFullIceSampler, outTexCoord);

    // 2. 计算填充遮罩 (从下往上，静谧的软边缘)
    // UV.y: 0(顶) -> 1(底)
    // fillLevel 代表当前冰面的高度位置 (0.0 在顶, 1.0 在底)
    // uProgress = 0 -> fillLevel = 1.0 (看不见)
    // uProgress = 1 -> fillLevel = 0.0 (全满)
    float fillLevel = 1.0 - uProgress;
    
    // 边缘软度 (类似雾气)
    float softness = 0.08; 
    
    // 计算 Alpha Mask
    // 当 UV.y > fillLevel 时显示 (即在水位线之下)
    // 使用 smoothstep 制作像雾一样的渐变边缘
    float maskAlpha = smoothstep(fillLevel, fillLevel + softness, outTexCoord.y);

    // 3. 计算贴图混合权重 (Severity)
    // 策略: 
    // 0% - 50%: 纯显示 Might (权重 0)
    // 50% - 100%: Full 逐渐叠加 (权重 0 -> 1)
    float severity = smoothstep(0.5, 1.0, uProgress);
    
    // 4. 混合颜色
    // 在 Might 的基础上叠加 Full
    vec4 finalColor = mix(colorMight, colorFull, severity);

    // 5. 应用遮罩和顶点颜色
    finalColor.a *= maskAlpha * outTint.a;

    // 6. 预乘 Alpha (防止 WebGL 混合过曝)
    finalColor.rgb *= finalColor.a;

    gl_FragColor = finalColor;
}