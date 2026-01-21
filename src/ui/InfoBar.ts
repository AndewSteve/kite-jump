import Phaser from 'phaser';
import UIEffectController from './UIEffectController';
import { TextureKeys, UITextureKeys } from '../config/AssetKeys';

export default class InfoBar extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Image;
    
    // 文本对象
    private timeText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private heightText!: Phaser.GameObjects.Text;
    private bambooText!: Phaser.GameObjects.Text;
    
    // 图标
    private bambooIcon!: Phaser.GameObjects.Image;

    // 特效控制器
    private heightEffect!: UIEffectController;
    private bambooEffect!: UIEffectController;

    // 布局尺寸
    private targetWidth: number;
    private targetHeight: number;

    /**
     * @param scene 场景
     * @param x 容器中心 X
     * @param y 容器中心 Y
     * @param width 目标宽度 (UI条的总宽)
     * @param height 目标高度 (UI条的总高)
     */
    constructor(scene: Phaser.Scene, x: number, y: number, width: number = 407, height: number = 78) {
        super(scene, x, y);
        this.scene = scene;
        this.targetWidth = width;
        this.targetHeight = height;

        // 设置容器自身的尺寸 (用于交互或物理计算，虽然这里主要是视觉)
        this.setSize(width, height);

        // --- 1. 创建背景并强制适配尺寸 ---
        this.bg = scene.add.image(0, 0, UITextureKeys.UIHUDFrame);
        // 关键：强制将图片拉伸/缩放到指定的 width/height
        // 这样无论原图多大，都会变成你想要的大小
        this.bg.setDisplaySize(this.targetWidth, this.targetHeight);
        this.add(this.bg);

        // --- 2. 动态计算分栏布局 ---
        // 我们需要 4 个区域。
        // 容器中心是 (0,0)，左边界是 -width/2，右边界是 width/2
        // 每个格子的宽度
        const sectionWidth = this.targetWidth / 4;
        
        // 计算四个格子的中心点 X 坐标：
        // 第1格中心: -1.5 * sectionWidth
        // 第2格中心: -0.5 * sectionWidth
        // 第3格中心:  0.5 * sectionWidth
        // 第4格中心:  1.5 * sectionWidth
        // (这是基于容器中心为0点的数学推导)
        
        const quarter = this.targetWidth / 4;
        // 稍微往上偏一点给 label，往下偏一点给数值
        const labelY = -this.targetHeight * 0.15; 
        const valueY = this.targetHeight * 0.15;

        // --- 样式定义 ---
        const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: '"Ma Shan Zheng", "Microsoft YaHei", cursive', 
            fontSize: `${Math.floor(height * 0.22)}px`, // 字体大小随高度动态变化
            color: '#e0e0e0',
            align: 'center'
        };

        const valueStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            fontSize: `${Math.floor(height * 0.35)}px`, // 字体大小随高度动态变化
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        };

        // --- 区域 1: 时间 (最左) ---
        // 坐标: -width/2 + sectionWidth/2  => -3/8 width
        const x1 = -this.targetWidth / 2 + sectionWidth * 0.5;
        this.add(scene.add.text(x1, labelY, '时间', labelStyle).setOrigin(0.5));
        this.timeText = scene.add.text(x1, valueY, '00:00', valueStyle).setOrigin(0.5);
        this.add(this.timeText);

        // --- 区域 2: 分数 ---
        const x2 = -this.targetWidth / 2 + sectionWidth * 1.5;
        this.add(scene.add.text(x2, labelY, '分数', labelStyle).setOrigin(0.5));
        this.scoreText = scene.add.text(x2, valueY, '0', valueStyle).setOrigin(0.5);
        this.add(this.scoreText);

        // --- 区域 3: 高度 ---
        const x3 = -this.targetWidth / 2 + sectionWidth * 2.5;
        this.add(scene.add.text(x3, labelY, '高度', labelStyle).setOrigin(0.5));
        this.heightText = scene.add.text(x3, valueY, '0m', valueStyle).setOrigin(0.5);
        this.add(this.heightText);

        // --- 区域 4: 竹节 (最右) ---
        const x4 = -this.targetWidth / 2 + sectionWidth * 3.5;
        // 计算 icon 和 文字的布局，让它们整体居中于 x4
        // 假设 icon 宽 30，文字宽 30，间距 5
        const iconOffset = 20; 
        
        this.add(scene.add.text(x4, labelY, '竹节', labelStyle).setOrigin(0.5));
        
        // 竹子数值 (偏左)
        this.bambooText = scene.add.text(x4 - iconOffset, valueY, '0', valueStyle).setOrigin(0.5);
        this.add(this.bambooText);

        // 竹子 Icon (偏右)
        this.bambooIcon = scene.add.image(x4 + iconOffset, valueY, TextureKeys.Bamboo);
        // 动态计算 Icon 大小，限制在高度的 60% 以内，防止撑破容器
        const maxIconHeight = this.targetHeight * 0.6;
        this.bambooIcon.setDisplaySize(maxIconHeight, maxIconHeight); 
        // 保持纵横比的话用 setScale，这里假设图片是正方形或者需要强制大小
        // 如果要保持比例，改用: 
        // const scale = maxIconHeight / this.bambooIcon.height;
        // this.bambooIcon.setScale(scale);
        
        this.bambooIcon.setRotation(Phaser.Math.DegToRad(15));
        this.add(this.bambooIcon);

        // --- 3. 初始化特效 ---
        this.initEffects();

        scene.add.existing(this);
    }

    private initEffects() {
        // A. 高度特效：Sustain (呼吸)
        this.heightEffect = new UIEffectController(this.scene, this.heightText, {
            glowColor: 0x44aaff,
            glowAlpha: 0.6,
            sustainScale: 1.15,
            sustainDuration: 1200,
            // 限制光晕扩散，防止超出格子太多
            glowSpread: 1.4 
        });
        // this.heightEffect.setSustain(true);

        // B. 竹节特效：Punch
        this.bambooEffect = new UIEffectController(this.scene, [this.bambooText, this.bambooIcon], {
            glowColor: 0x88ff88,
            punchScale: 1.4,
            punchDuration: 150,
            glowDuration: 0.4,
            glowSpread: 1.4
        });
    }

    // ... 下面的 setTime, setScore, setHeight, setBambooCount, updateEffect, destroy 代码保持不变 ...
    
    public setTime(timeStr: string) {
        this.timeText.setText(timeStr);
    }

    public setScore(score: number) {
        this.scoreText.setText(score.toString());
    }

    public setHeight(meters: number) {
        this.heightText.setText(meters.toFixed(0) + 'm');
    }

    public setBambooCount(count: number) {
        const oldVal = parseInt(this.bambooText.text);
        this.bambooText.setText(count.toString());
        if (count > oldVal) {
            this.bambooEffect.trigger();
        }
    }

    public update(_time:number, dt: number) {
        this.heightEffect.update(dt);
        this.bambooEffect.update(dt);
    }

    public destroy(fromScene?: boolean) {
        this.heightEffect.destroy();
        this.bambooEffect.destroy();
        super.destroy(fromScene);
    }
}