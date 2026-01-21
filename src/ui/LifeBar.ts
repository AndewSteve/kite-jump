import Phaser from 'phaser';
import UIEffectController from './UIEffectController';
import { UITextureKeys } from '../config/AssetKeys';

export default class LifeBar extends Phaser.GameObjects.Container {
    private maxLives: number = 3;
    private currentLives: number = 3;
    
    // 存储灯笼的数组
    private lanterns: Phaser.GameObjects.Sprite[] = [];
    
    // 存储特效控制器的数组 (每个灯笼配一对：受伤特效/回血特效)
    private damageEffects: UIEffectController[] = [];
    private healEffects: UIEffectController[] = [];

    private readonly SPACING = 60; // 灯笼之间的间距

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // 初始化 3 个灯笼
        for (let i = 0; i < this.maxLives; i++) {
            this.createLantern(i);
        }

        scene.add.existing(this);
    }

    private createLantern(index: number) {
        // 1. 创建 Sprite (默认满血)
        // 注意：这里用 Sprite 而不是 Image，虽然功能差不多，但 Sprite 更适合做动画扩展
        const lantern = this.scene.add.sprite(
            index * this.SPACING, // 水平排列
            0, 
            UITextureKeys.UILiveUp
        );
        
        // 假设素材比较大，稍微缩放一下 (根据实际情况调整)
        lantern.setScale(0.8);
        
        // 确保原点居中，这样缩放特效(Punch)才自然
        lantern.setOrigin(0.5);

        this.add(lantern);
        this.lanterns.push(lantern);

        // 2. 为这个灯笼绑定【受伤特效】(红色闪光，猛烈震动)
        const dmgFx = new UIEffectController(this.scene, lantern, {
            glowColor: 0xff0000,   // 红色光晕
            glowAlpha: 1.0,        // 极亮
            glowBlurStrength: 4,
            punchScale: 0.6,       // 受伤时瞬间缩小一下，产生"破碎"感
            punchDuration: 100,
            glowDuration: 0.3
        });
        this.damageEffects.push(dmgFx);

        // 3. 为这个灯笼绑定【回血特效】(金色光晕，放大呼吸)
        const healFx = new UIEffectController(this.scene, lantern, {
            glowColor: 0xffaa00,   // 金橙色光晕
            glowAlpha: 0.8,
            glowBlurStrength: 2,
            punchScale: 1.3,       // 获得生命时放大
            punchDuration: 200,
            glowDuration: 0.5
        });
        this.healEffects.push(healFx);
    }

    /**
     * 设置当前生命值
     * @param value 0 - 3
     */
    public setLives(value: number) {
        // 限制范围
        const newLives = Phaser.Math.Clamp(value, 0, this.maxLives);
        
        if (newLives === this.currentLives) return;

        // 判断是加血还是扣血
        if (newLives < this.currentLives) {
            // --- 扣血逻辑 ---
            // 例如：从 3 变 2，我们需要处理 index = 2 的那个灯笼 (0, 1, [2])
            // 也就是 currentLives - 1
            for (let i = this.currentLives - 1; i >= newLives; i--) {
                this.animateDamage(i);
            }
        } else {
            // --- 回血逻辑 ---
            // 例如：从 2 变 3，我们需要处理 index = 2 的那个灯笼
            for (let i = this.currentLives; i < newLives; i++) {
                this.animateHeal(i);
            }
        }

        this.currentLives = newLives;
    }

    /**
     * 执行受伤表现
     */
    private animateDamage(index: number) {
        const lantern = this.lanterns[index];
        const fx = this.damageEffects[index];

        // 1. 触发特效 (红光闪烁)
        fx.trigger();

        // 2. 延迟一点点切换图片，让玩家先看到红光闪一下，然后灯灭了
        this.scene.time.delayedCall(50, () => {
            lantern.setTexture(UITextureKeys.UILiveOff);
            // 也可以加个 tint 让灭掉的灯笼变暗
            lantern.setTint(0x888888); 
        });
    }

    /**
     * 执行回血表现
     */
    private animateHeal(index: number) {
        const lantern = this.lanterns[index];
        const fx = this.healEffects[index];

        // 1. 马上切换图片为亮灯
        lantern.setTexture(UITextureKeys.UILiveUp);
        lantern.clearTint(); // 清除变暗的颜色

        // 2. 触发特效 (金光放大)
        fx.trigger();
    }

    /**
     * 必须在 Scene update 中调用
     */
    public updateEffect(dt: number) {
        // 遍历更新所有特效控制器
        this.damageEffects.forEach(fx => fx.update(dt));
        this.healEffects.forEach(fx => fx.update(dt));
    }
}