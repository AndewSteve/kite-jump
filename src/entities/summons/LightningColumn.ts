import { BaseSummon, type ISummonInitData } from './BaseSummon';
import { GameConfig } from '../../config/GameConfig';

export class LightningColumn extends BaseSummon {
  private isStriking: boolean = false; // 是否处于伤害阶段
  private warningRect?: Phaser.GameObjects.Rectangle; // 预警线
  private strikeRect?: Phaser.GameObjects.Rectangle;  // 正式闪电
  
  // 伤害配置
  private readonly WARNING_WIDTH = 200;   // 预警线宽度
  private readonly DAMAGE_WIDTH = 100; // 闪电宽度
  private readonly DAMAGE_VAL = 1;     // 扣1血
  private readonly ENERGY_LOSS = 25;   // 扣25能量
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pixel'); 
    this.setVisible(false); // 本体仅仅是逻辑锚点
  }

  protected onStart(_data: ISummonInitData): void {
    const minZoom = GameConfig.camera.zoom.sprinting;
    const screenHeight = this.scene.scale.height;
    // const screenWidth = this.scene.scale.width;
    this.isStriking = false;

    // 1. 创建预警线 (淡淡的细线)
    // 随机 X 位置已经在 Spawn 时决定了 (this.x)
    this.warningRect = this.scene.add.rectangle(
      this.x, 
      screenHeight / 2, 
      this.WARNING_WIDTH, 
      screenHeight / minZoom, 
      0xFFFFFF, 0.3
    )
        .setScrollFactor(0)
        .setDepth(40); // 在玩家下面一点

    // 2. 预警动画 (1.5秒后劈下)
    this.scene.tweens.add({
        targets: this.warningRect,
        alpha: { from: 0.1, to: 0.5 },
        yoyo: true,
        repeat: 3,
        duration: 200,
        onComplete: () => {
            this.strike();
        }
    });
    
    // 3. 禁用物理 (手动判定)
    if (this.body) this.body.enable = false;
  }

  private strike() {
    if (this.isDespawning) return;
    this.isStriking = true;
    const minZoom = GameConfig.camera.zoom.sprinting;
    const screenHeight = this.scene.scale.height;
    // const screenWidth = this.scene.scale.width;

    // 移除预警
    this.warningRect?.destroy();
    
    // 创建闪电 (高亮粗柱子)
    // 颜色：雷电紫/白
    this.strikeRect = this.scene.add.rectangle(
      this.x, 
      screenHeight / 2, 
      this.DAMAGE_WIDTH, 
      screenHeight / minZoom, 
      0x8844FF
    )
        .setScrollFactor(0)
        .setDepth(100); // 最上层
    
    // 闪电冲击动画 (0.2秒瞬间)
    this.scene.tweens.add({
        targets: this.strikeRect,
        alpha: { from: 1, to: 0 },
        width: { from: this.DAMAGE_WIDTH, to: 0 },
        duration: 300,
        ease: 'Sine.easeOut',
        onComplete: () => {
            // ✅ 1. 视觉上：彻底移除闪电，让玩家以为结束了
            if (this.strikeRect) {
                this.strikeRect.destroy();
                this.strikeRect = undefined;
            }

            // ✅ 2. 逻辑上：强制关闭伤害判定 (防止隐形电人)
            this.isStriking = false;

            // ✅ 3. 核心修改：延迟 2秒 再真正回收
            // 这 2秒 期间，getActiveCount() 依然是 1，
            // 所以 LightningStrikeAction 会一直返回，不会生成新雷
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
    // ✅ 增加 check：如果 strikeRect 已经被销毁了 (处于幽灵冷却期)，直接返回
    if (!this.isStriking || !this.strikeRect || this.strikeRect.alpha < 0.5) return;
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
    this.strikeRect?.destroy();
    this.kill();
  }
}