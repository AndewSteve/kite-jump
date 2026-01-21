import Phaser from 'phaser';

export interface IUIEffectConfig {
    glowColor?: number;
    glowAlpha?: number;       // 光晕最大透明度
    glowBlurStrength?: number;    // 发光强度
    glowSpread?: number;      // ✅ 新增：扩散系数 (1.5 表示光晕层比原图大 1.5 倍)
    glowDuration?: number;    // 倒计时维持时间 (秒)
    punchScale?: number;      // 缩放倍率 (例如 1.2)
    punchDuration?: number;   // 缩放动画时间 (ms)

    // ✅ 新增：呼吸参数 (Sustain)
    sustainScale?: number;   // 呼吸时的最大缩放 (比如 1.1)
    sustainDuration?: number;// 呼吸一次的时间 (比如 1000ms)
}

export default class UIEffectController {
    private scene: Phaser.Scene;
    // ✅ 修改 1: 支持单个对象或对象数组
    private targets: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform)[];
    // ✅ 修改 2: 存储多个 FX 实例 (对应每个 target)
    private bloomFXs: Phaser.FX.Bloom[] = [];
    // 发光层 (背景，负责模糊发光)
    private glowCopies: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Text)[] = [];
    
    // 状态管理
    private glowTimer: number = 0;       // 剩余高亮时间 (秒)
    private isSustained: boolean = false;
    
    // 配置
    private config: IUIEffectConfig;
    // 记录每个对象的原始缩放，防止缩放错乱
    private baseScales: Map<Phaser.GameObjects.GameObject, number> = new Map();

    constructor(
        scene: Phaser.Scene, 
        // 允许传入单个对象或数组
        targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], 
        config: IUIEffectConfig = {}
    ) {
        this.scene = scene;
        this.targets = Array.isArray(targets) ? targets : [targets] as any;

        // 记录基础缩放值
        this.targets.forEach(t => {
            this.baseScales.set(t, (t as any).scale ?? 1);
        });

        this.config = {
            glowColor: 0xffaa00, 
            glowAlpha: 1.0,      
            glowBlurStrength: 2, 
            
            // ✅ 核心修正 1: 默认让光晕层比原图大 60%，确保露出来
            glowSpread: 1.6,     
            
            glowDuration: 0.5,   
            punchScale: 1.5,
            punchDuration: 120,
            ...config
        };

        // ✅ 初始化：生成底下的发光层
        this.createGlowCopies();
    }

    private createGlowCopies() {
        this.targets.forEach(target => {
            let copy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;

            // 1. 克隆对象
            if (target instanceof Phaser.GameObjects.Sprite) {
                copy = this.scene.add.sprite(target.x, target.y, target.texture.key, target.frame.name);
            } else if (target instanceof Phaser.GameObjects.Text) {
                copy = this.scene.add.text(target.x, target.y, target.text, target.style);
                // 文本需要设置 padding 防止模糊被切边
                copy.setPadding(10); 
                // 确保对齐方式一致
                copy.setOrigin(target.originX, target.originY);
            } else {
                return; // 不支持的类型跳过
            }

            // 2. 设置发光层属性
            copy.setDepth(target.depth - 1); // ✅ 放在底下
            copy.setTint(this.config.glowColor); // 染成光晕色
            copy.setBlendMode(Phaser.BlendModes.ADD);
            // copy.setBlendMode(Phaser.BlendModes.NORMAL);
            // copy.setTint(0x00ff00);
            copy.setAlpha(0); // 默认隐藏
            // 初始应用扩散系数
            const baseScale = this.baseScales.get(target) || 1;
            copy.setScale(baseScale * (this.config.glowSpread || 1.6));

            // 应用模糊
            copy.postFX.addBlur(
              this.config.glowBlurStrength, 
              this.config.glowBlurStrength, 
              1
            ); 

            // ✅ 核心修复：给 FX 添加内边距
            // 这告诉 Phaser：“渲染这个特效时，请在纹理周围多留出 32 像素的空间”
            // 防止光晕被切边或完全裁掉
            // blurFx.pad = 32; 

            this.glowCopies.push(copy);

            // 3. ✅ 核心修复：正确的层级插入逻辑
            // 不再使用 setDepth 或 addAt(0)
            
            if (target.parentContainer) {
                // 情况 A: 目标在容器里
                const container = target.parentContainer;
                
                // 先把 copy 加进容器 (默认会加到最上面)
                container.add(copy);
                
                // ⚡️ 关键：把 copy 移动到 target 的正下方 (index - 1)
                // 这样它会在 target 后面，但会在容器背景的前面
                container.moveBelow(copy, target);
                
            } else {
                // 情况 B: 目标直接在 Scene 的显示列表里
                // ⚡️ 关键：Phaser Scene 也有 moveBelow 方法
                this.scene.children.moveBelow(copy, target);
            }
        });
    }

    /**
     * ✅ 核心方法：设置持续态
     */
    public setSustain(active: boolean) {
        if (this.isSustained === active) return;
        this.isSustained = active;

        if (active) {
            // 进入持续态：启动呼吸
            this.startBreathing();
        } else {
            // 离开持续态：停止呼吸，归位
            this.stopBreathing();
        }
    }

    /**
     * 内部方法：启动柔和的呼吸动画
     */
    private startBreathing() {
        this.targets.forEach((target, index) => {
            const baseScale = this.baseScales.get(target) || 1;
            const copy = this.glowCopies[index];

            // 1. 确保光晕显现
            this.scene.tweens.killTweensOf(copy);
            this.scene.tweens.add({
                targets: copy,
                alpha: this.config.glowAlpha || 1.0,
                duration: 300 // 柔和淡入
            });

            // 2. 启动主体呼吸
            this.scene.tweens.killTweensOf(target);
            this.scene.tweens.add({
                targets: target,
                scale: baseScale * (this.config.sustainScale || 1.1),
                duration: this.config.sustainDuration || 800,
                yoyo: true,
                repeat: -1, // 无限循环
                ease: 'Sine.easeInOut' // 呼吸感专用缓动
            });
        });
    }

    /**
     * 内部方法：停止呼吸并归位
     */
    private stopBreathing() {
        this.targets.forEach((target) => {
            const baseScale = this.baseScales.get(target) || 1;
            
            this.scene.tweens.killTweensOf(target);
            // 柔和归位
            this.scene.tweens.add({
                targets: target,
                scale: baseScale,
                duration: 200,
                ease: 'Quad.easeOut'
            });
        });
        
        // 注意：这里我们不强制把 glow copy 的 alpha 设为 0
        // 而是让 update() 里的 glowTimer 逻辑自然接管
        // 这样如果刚退出 Sustain 马上又吃了个金币，光晕不会闪烁
        this.glowTimer = 0.5; // 给一点缓冲时间让 update 去淡出
    }

    /**
     * 外部调用的触发函数
     * 例如：吃到金币时调用 coinEffect.trigger()
     */
   public trigger() {
        // 重置倒计时
        this.glowTimer = this.config.glowDuration || 0.5;

        // 1. 前景层：只负责缩放 (保持清晰)
        this.targets.forEach((target, index) => {
            const baseScale = this.baseScales.get(target) || 1;
            const copy = this.glowCopies[index];
            const punchScaleVal = baseScale * (this.config.punchScale || 1.5);

            
            // 确保光晕立刻显现 (Alpha 动画独立)
            this.scene.tweens.killTweensOf(copy);
            this.scene.tweens.add({
              targets: copy,
              alpha: this.config.glowAlpha, // 快速亮起
              duration: 100, // 100ms 亮起
              ease: 'Linear'
            });
            
            // 使用 chain (Phaser 3.60+) 或者 createTimeline
            this.scene.tweens.killTweensOf(target);
            this.scene.tweens.chain({
                targets: target,
                tweens: [
                    // 第一步：放大
                    {
                        scale: punchScaleVal,
                        duration: this.config.punchDuration,
                        ease: 'Quad.easeOut'
                    },
                    // 第二步：强制缩回原始大小 (baseScale)
                    {
                        scale: baseScale,
                        duration: this.config.punchDuration,
                        ease: 'Quad.easeIn' // 回弹用 easeIn 会更有弹性
                    }
                ],
                // ✅ 关键逻辑：动画做完后，检查是否需要恢复呼吸
                onComplete: () => {
                    // 强制归位防止误差
                    (target as any).setScale(baseScale);
                    
                    // 如果处于 Sustain 态，刚才的 Punch 打断了呼吸，现在要续上
                    if (this.isSustained) {
                        this.startBreathing();
                    }
                },
                //以此确保万一动画意外停止，也能归位
                onStop: () => {
                   (target as any).setScale(baseScale);
                }
            });
        });
    }

    /**
     * 需要在 Scene 的 update 中调用
     * @param dt 毫秒
     */
    // 如果是持续态 -> 呼吸效果
    public update(dt: number) {
        if (this.glowCopies.length === 0) return;
        const dtSec = dt / 1000;

        // 1. 同步状态 (非常重要！)
        // 因为 UI (比如分数) 会变，Icon 位置可能会动
        this.targets.forEach((target, index) => {
            const copy = this.glowCopies[index];
            if (!copy) return;

            // 同步坐标
            copy.setPosition(target.x, target.y);
            
            // 如果是文本，必须同步文字内容
            if (target instanceof Phaser.GameObjects.Text && copy instanceof Phaser.GameObjects.Text) {
                if (copy.text !== target.text) {
                    copy.setText(target.text);
                }
            }

            // --- 3. ✅ 核心修正: 缩放完全跟随 (Slave Mode) ---
            // 每一帧都把 copy 的大小设为 target 的 (1.6) 倍
            // 这样无论 target 是正在变大还是回缩，copy 都会完美同步，不会突变
            const spread = this.config.glowSpread || 1.6;
            copy.setScale(target.scaleX * spread, target.scaleY * spread);
            
            // 同步旋转 (如果有)
            copy.setRotation(target.rotation);
        });

        if (this.isSustained) {
            return; // 跳过后续淡出逻辑
        }

        // 2. 处理光晕淡出
        if (this.glowTimer > 0) {
            this.glowTimer -= dtSec;
            // 维持阶段 (Keeping Alive)
        } else {
            // 倒计时结束，淡出光晕
            this.glowCopies.forEach(copy => {
                if (copy.alpha > 0) {
                    // 平滑淡出
                    copy.alpha -= 2.0 * dtSec; 
                    if (copy.alpha < 0) copy.alpha = 0;
                }
            });
        }
    }

    private removeFX() {
        // 移除所有 FX
        this.bloomFXs.forEach((fx, index) => {
            const target = this.targets[index] as any;
            if (target && target.postFX) {
                target.postFX.remove(fx);
            }
        });
        this.bloomFXs = [];
    }
    
    public destroy() {
      this.removeFX();
      this.glowCopies.forEach(copy => copy.destroy());
      this.glowCopies = [];
    }
}