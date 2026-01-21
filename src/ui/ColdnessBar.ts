import Phaser from 'phaser';
import ColdnessPipeline from '../pipelines/ColdnessPipeline';
import type RenderManager from '../managers/RenderManager';
import { UITextureKeys } from '../config/AssetKeys';
import { PipelineID } from '../managers/RenderManager';

export default class ColdnessBar extends Phaser.GameObjects.Container {
    private backWater: Phaser.GameObjects.Image;
    private backIce: Phaser.GameObjects.Image;
    
    private frameEmpty: Phaser.GameObjects.Image;
    private frameMid: Phaser.GameObjects.Image;
    private frameFull: Phaser.GameObjects.Image;

    private pipeline: ColdnessPipeline | null = null;
    private renderManager: RenderManager;

    private currentColdness: number = 0; // 0 - 100
    private maxColdness: number = 100;

    constructor(scene: Phaser.Scene, x: number, y: number, renderManager: RenderManager) {
        super(scene, x, y);
        this.renderManager = renderManager;

        // 1. 底层：水 (常驻，作为背景)
        this.backWater = scene.add.image(0, 0, UITextureKeys.UIColdnessBackWater);
        this.add(this.backWater);

        // 2. 中层：冰 (核心变化层)
        // 这一层会覆盖在水上面，通过 Shader 从下往上显示
        this.backIce = scene.add.image(0, 0, UITextureKeys.UIColdnessBackIceMight);
        this.add(this.backIce);

        // ⚡️ 应用 Shader Pipeline
        this.backIce.setPipeline(PipelineID.Coldness);
        // this.backIce.setBlendMode(Phaser.BlendModes.NORMAL);
        // 获取 pipeline 实例以便后续更新 uniform
        this.pipeline = this.renderManager.getPipeline<ColdnessPipeline>(PipelineID.Coldness);

        // 3. 顶层：框 (三层叠加)
        // Frame Empty: 永远可见 (作为底框)
        this.frameEmpty = scene.add.image(0, 0, UITextureKeys.UIColdnessFrameEmpty);
        this.add(this.frameEmpty);

        // Frame Mid: 0-50% 逐渐显现
        this.frameMid = scene.add.image(0, 0, UITextureKeys.UIColdnessFrameMid);
        this.frameMid.setAlpha(0);
        this.add(this.frameMid);

        // Frame Full: 50-100% 逐渐显现
        this.frameFull = scene.add.image(0, 0, UITextureKeys.UIColdnessFrameFull);
        this.frameFull.setAlpha(0);
        this.add(this.frameFull);

        scene.add.existing(this);
    }

    /**
     * 设置寒冷值
     * @param value 0 - 100
     */
    public setColdness(value: number) {
        const clamped = Phaser.Math.Clamp(value, 0, this.maxColdness);
        this.currentColdness = clamped;
        const percent = clamped / this.maxColdness; // 0.0 - 1.0
        console.log(`ColdnessBar: Setting coldness to ${clamped} (${(percent*100).toFixed(1)}%)`);

        // --- A. 更新 Shader (内部填充) ---
        if (this.pipeline) {
            this.pipeline.setProgress(percent);
        }

        // --- B. 更新 Frame Alpha (边框变化) ---
        // 策略：
        // 0% - 50%: Empty 保持可见, Mid 从 0 变到 1
        // 50% - 100%: Mid 保持可见, Full 从 0 变到 1
        
        let midAlpha = 0;
        let fullAlpha = 0;

        if (percent <= 0.5) {
            // 区间 0.0 - 0.5 -> 映射到 0.0 - 1.0
            midAlpha = percent / 0.5;
            fullAlpha = 0;
        } else {
            // 区间 0.5 - 1.0 -> 映射到 0.0 - 1.0
            midAlpha = 1;
            fullAlpha = (percent - 0.5) / 0.5;
        }

        this.frameMid.setAlpha(midAlpha);
        this.frameFull.setAlpha(fullAlpha);

        // --- C. 游戏结束逻辑 ---
        if (clamped >= this.maxColdness) {
            this.triggerFreezeDeath();
        }
    }

    private triggerFreezeDeath() {
        // 防止重复触发
        if (this.scene.data.get('isGameOver')) return;
        
        console.log('❄️ Frozen Death Triggered!');
        // 发送事件给主逻辑
        // this.scene.events.emit('GAME_OVER', 'freeze');
    }

    /**
     * 必须在 Scene update 中调用
     * 用于驱动 Shader 的波浪动画
     */
    public update(time: number, delta: number) {
        if (this.pipeline) {
            this.pipeline.updateTime(time);
        }
    }
}