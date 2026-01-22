import { BaseSummon, type ISummonInitData } from './BaseSummon';
import { EVENTS, gameEvents } from '../../config/Events'; // 确保路径正确
import { TextureKeys } from '../../config/AssetKeys';

export class WindVane extends BaseSummon {
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.WindArrow); 
  }

  protected onStart(_data: ISummonInitData): void {
    // 1. 设置 UI 属性
    this.setScrollFactor(0); // 锁定屏幕
    this.setDepth(100);      // 最上层
    this.setScale(0.5);      // 小一点
    this.setAlpha(0);        // 初始隐藏，有风时显示
    
    // 放置在屏幕顶部中间
    const { width } = this.scene.scale;
    this.setPosition(width / 2, 100);

    // 2. 监听风力变化
    gameEvents.on(EVENTS.WIND_CHANGE, this.onWindChange, this);
    
  }

  private onWindChange(windValue: number) {
    if (windValue === 0) {
      // 无风：淡出
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 300 });
    } else {
      // 有风：淡入并旋转
      // 假设图片默认箭头向上：
      // 风 > 0 (向右) -> 旋转 90度
      // 风 < 0 (向左) -> 旋转 -90度
      const targetAngle = windValue > 0 ? 90 : -90;
      
      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        angle: targetAngle,
        duration: 500,
        ease: 'Back.out'
      });
    }
  }

  protected onUpdate(_dt: number): void {
    // 可以加一点漂浮动画
  }

  // ✅ 重写：移除监听 -> 淡出 -> kill
  protected override onDespawn(): void {
    // 1. 立即停止监听，防止淡出期间收到事件导致状态错乱
    gameEvents.off(EVENTS.WIND_CHANGE, this.onWindChange, this);

    // 2. 淡出动画
    this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 300,
        onComplete: () => {
            this.kill();
        }
    });
  }
}
