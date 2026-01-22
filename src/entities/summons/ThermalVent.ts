import { TextureKeys } from '../../config/AssetKeys';
import { GameConfig } from '../../config/GameConfig';
import { BaseSummon, type ISummonInitData } from './BaseSummon';

const RedCliffConfigs = {
  holdSpeed: -300, // 赤壁热流停留速度
}

export class ThermalVent extends BaseSummon {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 假设你在 preload 加载了一个叫 'vfx_red_column' 的图
    // 或者直接用 'pixel' 纯色块拉伸
    super(scene, x, y, TextureKeys.ThermalVent); 
    this.setVisible(true); // 本体可见
  }

  protected onStart(_data: ISummonInitData): void {
    // 1. 设置外观 (红光柱)
    this.setTint(0xff0000);
    this.setAlpha(0);
    
    // 2. 尺寸与位置
    // 既然是 Screen Space，高度设为屏幕高度即可
    const minZoom = GameConfig.camera.zoom.sprinting;
    const screenHeight = this.scene.scale.height;
    const screenWidth = this.scene.scale.width;
    
    const ventWidth = screenWidth / 5; // 宽 1/5
    
    // 关键：scrollFactor 已由 SummonManager 设为 0
    this.setDisplaySize(ventWidth, screenHeight/ minZoom);
    
    // 设置锚点为中心，方便计算
    this.setOrigin(0.5, 0.5);
    
    // 确保位置在屏幕垂直中间 (因为 y 传进来的是 screenHeight/2)
    this.y = screenHeight / 2;

    // 3. 关闭不必要的物理
    // 我们手动检测，不需要 Arcade Body 参与碰撞
    if (this.body) {
        this.body.enable = false; 
    }
    
    // 进场动画
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0, to: 0.3 },
      duration: 1000
    });
  }

  protected onUpdate(_dt: number): void {
    // ✅ 如果正在消失，不再生效，避免玩家觉得"明明看不见了怎么还有力"
    if (this.isDespawning) return;
    // ✅ 核心：自定义屏幕空间碰撞检测
    // 思路：将玩家的世界坐标映射到屏幕坐标，然后看是否在光柱范围内
    
    if (!this.target || !this.target.active) return;

    // 1. 获取玩家的屏幕 X 坐标
    // 公式：ScreenX = WorldX - CameraScrollX
    const camera = this.scene.cameras.main;
    const playerScreenX = this.target.x - camera.scrollX;

    // 2. 计算判定范围
    // this.x 已经是屏幕坐标了 (0-720)
    const halfWidth = this.displayWidth / 2;
    const leftBound = this.x - halfWidth;
    const rightBound = this.x + halfWidth;

    // 3. 判断是否在区间内
    if (playerScreenX >= leftBound && playerScreenX <= rightBound) {
        this.onPlayerStay();
    }
  }
  
  private onPlayerStay() {
    // 给玩家续费 Buff
    // 由于 Buff 是持续 0.2s 的，这里只要一直调，玩家就一直有浮力
    if (!this.target) {
      return;
    }
    const body = this.target!.body as Phaser.Physics.Arcade.Body;
    if (!body) {
      console.warn("Target body is null or undefined");
      return;
    }
    if (body.velocity.y > RedCliffConfigs.holdSpeed 
      && !this.target.playerState.isDashing) {
      this.target.setVelocityY(RedCliffConfigs.holdSpeed);
    }
  }

  protected onDespawn(): void {
    // 2. 播放淡出动画
    this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 500, // 0.3秒淡出
        onComplete: () => {
          // ✅ 动画播完了，告诉父类“我可以死了”
          this.kill();
        }
    });
  }
}