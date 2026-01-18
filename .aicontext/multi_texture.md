# Phaser 3.85+ 自定义多纹理 Pipeline 开发指南

## 核心概念

在 Phaser 3.60+（特别是 3.80+）版本中，渲染管线的 API 发生了重大变化。
旧版本中常用的 `renderer.textures.bind` 或直接操作 `gl.bindTexture` 的方法已不再推荐，甚至会报错。

新的标准做法是利用 **`Pipeline.bindTexture`** 方法，并处理 **`WebGLTextureWrapper`** 对象。

---

## 1. Shader 编写规范

对于多纹理特效（例如：主图 + 噪点图），Shader 需要定义额外的 sampler。

**Fragment Shader (`Dissolve.frag`):**

```glsl
#define SHADER_NAME DISSOLVE_FS
precision mediump float;

// [Slot 0] 主纹理 (Sprite 本身)
// 即使我们手动把 %count% 替换为 1，这个定义通常保留
uniform sampler2D uMainSampler[%count%];

// [Slot 1] 额外的噪点纹理 (手动绑定)
uniform sampler2D uNoiseSampler; 

varying vec2 outTexCoord;
varying vec4 outTint;

void main()
{
    // ... 采样主纹理 ...
    vec4 mainColor = texture2D(uMainSampler[0], outTexCoord);

    // ... 采样噪点纹理 (使用标准 UV 或自定义 UV) ...
    float noiseValue = texture2D(uNoiseSampler, outTexCoord).r;

    // ... 混合逻辑 ...
    gl_FragColor = mainColor; 
}

```

---

## 2. Pipeline 类实现 (TypeScript)

这是最关键的部分。要在 `onBind` 生命周期中正确绑定额外的纹理。

**关键点：**

1. 使用 `this.bindTexture(wrapper, unit)` 而不是 `renderer` 的方法。
2. 纹理对象不再是原生的 `WebGLTexture`，而是 `frame.source.glTexture` (Wrapper)。
3. 如果 Shader 中使用了 `%count%`，记得在构造函数中处理（如不需要批量，替换为 '1' 以节省槽位）。

```typescript
import Phaser from 'phaser';

// 假设已导入 shader 字符串
import VertShader from '../shaders/Dissolve.vert?raw';
import FragShader from '../shaders/Dissolve.frag?raw';

export default class DissolvePipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
    constructor(game: Phaser.Game) {
        // 优化：将 %count% 替换为 '1'
        // 避免占用所有 16 个纹理槽位，导致没地方放 uNoiseSampler 报错
        const safeFrag = FragShader.replace(/%count%/gi, '1');

        super({
            game,
            vertShader: VertShader,
            fragShader: safeFrag
        });
    }

    onBoot() {
        // 可在此设置静态 Uniform，如 uNoiseSampler 的槽位索引
        this.set1i('uNoiseSampler', 1);
    }

    /**
     * 每次 Pipeline 被激活用于渲染 Sprite 之前调用
     */
    onBind() {
        // 1. 必须先调用 super，让 Phaser 绑定主 Sprite 纹理到 Slot 0
        super.onBind(); 

        // 2. 获取额外纹理的 Frame
        const noiseKey = 'vfx_noise_bar'; // 你的资源 Key
        const frame = this.game.textures.getFrame(noiseKey);

        if (!frame) {
            console.warn(`Texture ${noiseKey} missing`);
            return;
        }

        // 3. 获取 WebGLTextureWrapper
        // 注意：source.glTexture 是 Phaser 封装的包装器对象
        // 使用 (frame.source as any) 绕过可能的 TS 类型定义缺失
        const glTextureWrapper = (frame.source as any).glTexture;

        if (glTextureWrapper) {
            // ✅ 正确做法：使用 Pipeline 实例的 bindTexture 方法
            // 参数 1: 纹理包装器
            // 参数 2: 纹理单元 ID (Slot 1)
            this.bindTexture(glTextureWrapper, 1);
            
            // 再次确认 Uniform 指向 Slot 1
            this.set1i('uNoiseSampler', 1);
        } else {
            // 如果纹理尚未上传到 GPU (懒加载)，这里可能是 null/undefined
            // 通常只要在 Preload 阶段加载了图片，Phaser 会在合适的时机处理
            // 也可以尝试强制上传 (视具体版本 API 而定)
        }
    }
}

```

---

## 3. 注册与使用

在 `RenderManager` 或 `Scene` 中注册并应用。

```typescript
// 注册
const pipeline = new DissolvePipeline(this.game);
this.renderer.pipelines.add('Dissolve', pipeline);

// 使用
const sprite = this.add.sprite(x, y, 'my_sprite');
sprite.setPipeline('Dissolve');

// 驱动效果 (例如通过 Tint.r 传参)
sprite.setTint(0x00ffff); // r=0, 进度=0

```

---

## 常见坑点 (Troubleshooting)

### 1. 报错 `renderer.textures is undefined` 或 `setTextureSource is not a function`

* **原因**：试图访问私有或已废弃的 Renderer API。
* **解决**：始终使用 `pipeline.bindTexture()`。

### 2. 报错 `texture image units count exceeds MAX_TEXTURE_IMAGE_UNITS`

* **原因**：Shader 里的 `uMainSampler[%count%]` 默认展开为 16 (数组 0-15)，占满了所有槽位。你再加一个 `uNoiseSampler` 就变成第 17 个了。
* **解决**：在构造函数里把 `%count%` 字符串替换为 `'1'`。

### 3. 报错 `parameter 2 is not of type 'WebGLTexture'`

* **原因**：试图把 `null` 或 `undefined` 传给 `bindTexture`。
* **解决**：由于 Phaser 的懒加载机制，图片可能还没上传到 GPU。确保图片已加载，并在代码中判空 `if (glTextureWrapper)`。

### 4. 类型 `Console` 上不存在属性 `warnOnce`

* **原因**：`console.warnOnce` 是 Phaser 内部工具函数，并不是标准浏览器 API，或者 TypeScript 定义不包含它。
* **解决**：直接用 `console.warn`，或者自己写一个简单的防抖逻辑。

```typescript
// 简单的 warnOnce 实现
private hasWarned = false;
// ...
if (!this.hasWarned) {
    console.warn("Texture missing!");
    this.hasWarned = true;
}

```