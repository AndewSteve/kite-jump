import { BaseSummon, type ISummonInitData } from './BaseSummon';
import { GameConfig } from '../../config/GameConfig';
import AudioManager from '../../managers/AudioManager';
import { AudioKeys, VFXTextureKeys } from '../../config/AssetKeys';
import { PipelineID } from '../../managers/RenderManager';
import type LightningFadePipeline from '../../pipelines/LightningFadePipeline';

export class LightningColumn extends BaseSummon {
  private isStriking: boolean = false; // 是否处于伤害阶段
  private warningRect?: Phaser.GameObjects.Rectangle; // 预警线
  private alertIcon?: Phaser.GameObjects.Image; // 预警图标
  private alertBg?: Phaser.GameObjects.Sprite; // 预警背景动效
  private strikeSprite?: Phaser.GameObjects.Sprite;  // 正式闪电
  private strikeProgress: number = 0;
  
  // 伤害配置
  private readonly WARNING_WIDTH = 200;   // 预警线宽度
  private readonly DAMAGE_WIDTH = 100; // 闪电宽度
  private readonly DAMAGE_VAL = 1;     // 扣1血
  private readonly ENERGY_LOSS = 25;   // 扣25能量
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pixel'); 
    this.setVisible(false); // 本体仅仅是逻辑锚点
    this.setAlpha(0);
  }

  protected onStart(_data: ISummonInitData): void {
    const minZoom = GameConfig.camera.zoom.sprinting;
    const screenHeight = this.scene.scale.height;
    // const screenWidth = this.scene.scale.width;
    this.isStriking = false;
    this.strikeProgress = 0;

    // 1. 创建预警线 (红色闪烁)
    // 随机 X 位置已经在 Spawn 时决定了 (this.x)
    this.warningRect = this.scene.add.rectangle(
      this.x,
      screenHeight / 2,
      this.WARNING_WIDTH,
      screenHeight / minZoom,
      0xFF3333, 0.3
    )
        .setScrollFactor(0)
        .setDepth(40); // 在玩家下面一点

    const alertAnimKey = 'alert_lightning_bg';
    if (!this.scene.anims.exists(alertAnimKey)) {
      this.scene.anims.create({
        key: alertAnimKey,
        frames: this.scene.anims.generateFrameNumbers(VFXTextureKeys.VfxAlertBg, { start: 0, end: 8 }),
        frameRate: 12,
        repeat: -1
      });
    }

    this.alertBg = this.scene.add.sprite(this.x, screenHeight / 2, VFXTextureKeys.VfxAlertBg)
      .setScrollFactor(0)
      .setDepth(41)
      .setScale(2.5);
    this.alertBg.play(alertAnimKey);

    this.alertIcon = this.scene.add.image(this.x, screenHeight / 2, VFXTextureKeys.VfxAlertIcon)
      .setScrollFactor(0)
      .setDepth(42)
      .setScale(0.5);

    // 2. 预警动画 (1.5秒后劈下)
    this.scene.tweens.add({
        targets: this.warningRect,
        alpha: { from: 0.1, to: 0.7 },
        yoyo: true,
        repeat: 4,
        duration: 200,
        onComplete: () => {
            this.strike();
        }
    });

    this.scene.tweens.add({
        targets: this.alertIcon,
        alpha: { from: 0.2, to: 1 },
        yoyo: true,
        repeat: 4,
        duration: 180
    });

  }

  private strike() {
    if (this.isDespawning) return;
    this.isStriking = true;
    const minZoom = GameConfig.camera.zoom.sprinting;
    const screenHeight = this.scene.scale.height;
    // const screenWidth = this.scene.scale.width;

    // 移除预警
    this.warningRect?.destroy();
    this.alertIcon?.destroy();
    this.alertBg?.destroy();
    
    const frameIndex = Phaser.Math.Between(0, 4);
    this.strikeSprite = this.scene.add.sprite(
      this.x,
      screenHeight / 2,
      VFXTextureKeys.VfxLightningLine,
      frameIndex
    )
        .setScrollFactor(0)
        .setDepth(100); // 最上层
    this.strikeSprite.setRotation(Math.PI / 2);
    this.strikeSprite.setDisplaySize(screenHeight / minZoom, this.DAMAGE_WIDTH);

    AudioManager.playSfx(AudioKeys.SfxThunderbolt);

    let pipeline: LightningFadePipeline | undefined;
    if (this.scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.strikeSprite.setPipeline(PipelineID.LightningFade);
      pipeline = this.strikeSprite.pipeline as LightningFadePipeline;
      pipeline?.setProgress(0);
      // pipeline?.setColor(0x3aa0ff);
    }
    
    // 闪电冲击动画 (0.5秒进度 + 0.5秒淡出)
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.chain({
        targets: this,
        tweens: [
          {
            strikeProgress: 1,
            duration: 500,
            ease: 'Sine.easeOut',
            onUpdate: () => {
                if (pipeline) {
                  pipeline.setProgress(this.strikeProgress);
                }
            },
          },
          {
            targets: this.strikeSprite,
            alpha: 0,
            duration: 500,
            ease: 'Sine.easeOut',
          }
        ],
        onComplete: () => {
          this.isStriking = false;
          if (this.strikeSprite) {
            this.strikeSprite.destroy();
            this.strikeSprite = undefined;
          }
  
          this.isStriking = false;
  
          const COOLDOWN_TIME = 2000; 
  
          this.scene.time.delayedCall(COOLDOWN_TIME, () => {
               this.despawn(); 
          });
        }
    });

    // 震屏
    this.scene.cameras.main.shake(200, 0.005);
  }

  protected onUpdate(_dt: number): void {
    // 只有在劈下的一瞬间 (isStriking) 且 闪电还没完全消失时判定
    // ✅ 增加 check：如果 strikeSprite 已经被销毁了 (处于幽灵冷却期)，直接返回
    if (!this.isStriking || !this.strikeSprite || this.strikeProgress >= 1) return;
    if (!this.target || !this.target.active) return;
    
    // --- 碰撞判定 (屏幕空间) ---
    const camera = this.scene.cameras.main;
    const playerScreenX = this.target.x - camera.scrollX;
    
    // 判定范围
    const left = this.x - this.DAMAGE_WIDTH / 2;
    const right = this.x + this.DAMAGE_WIDTH / 2;

    if (playerScreenX >= left && playerScreenX <= right) {
        this.onHitPlayer();
    }
  }

  private onHitPlayer() {
    if (!this.target) return;
    
    // 1. 检查无敌 (冲刺状态免疫雷击)
    if (this.target.playerState.isDashing || this.target.playerState.buffs.hasTag('State.Invincible')) {
        // 可以播一个 "Block" 特效
        console.log("Lightning Blocked!");
        this.isStriking = false; // 此次攻击失效，防止每一帧都扣血
        return;
    }

    // 2. 扣血 & 扣能
    // 防止一帧扣多次，打中一次就标记失效
    this.isStriking = false; 
    
    this.target.playerState.applyDamage(this.DAMAGE_VAL);
    this.target.playerState.addDashEnergy(-this.ENERGY_LOSS);
    
    // 击飞效果?
    // this.target.setVelocityY(-200); // 被砸下去
    this.target.setTint(0x555555); // 变焦黑
    this.scene.time.delayedCall(200, () => this.target?.clearTint());
  }

  protected override onDespawn(): void {
    this.warningRect?.destroy();
    this.alertIcon?.destroy();
    this.alertBg?.destroy();
    this.strikeSprite?.destroy();
    this.kill();
  }
}


