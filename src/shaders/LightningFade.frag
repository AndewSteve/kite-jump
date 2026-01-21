#define SHADER_NAME LIGHTNING_FADE_FS
precision mediump float;

uniform sampler2D uMainSampler[%count%];
uniform float uProgress; // 0.0 - 1.0, reveal top to bottom
uniform vec3 uColor;

varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

void main()
{
    vec4 texColor = texture2D(uMainSampler[0], outTexCoord);

    float softness = 0.05;
    float mask = 1.0 - smoothstep(uProgress, uProgress + softness, outTexCoord.y);
    // float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

    vec4 color;
    // color.rgb = uColor * luminance;
    color.rgb = texColor.rgb;
    // color.a = mask * luminance * outTint.a;
    color.a = mask * texColor.a;
    color.rgb *= color.a;

    // gl_FragColor = color;
    gl_FragColor = color;
}
