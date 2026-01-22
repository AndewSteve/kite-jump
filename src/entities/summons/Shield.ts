import Phaser from 'phaser';
import { BaseSummon, type ISummonInitData} from './BaseSummon';
import { VFXTextureKeys } from '../../config/AssetKeys';
import { EntityTextureScale } from '../../config/EntityConfig';

// 定义盾牌的特有配置，如果需要的话也可以放到外部配置里

export class Shield extends BaseSummon {
  // 添加一个标志位，防止在退场动画播放时重复触发 destroy
  // 旋转速度 (弧度/毫秒)
  private readonly _rotationSpeed: number = Phaser.Math.DegToRad(90) / 1000; // 每秒转90度

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene,x,y, VFXTextureKeys.VfxShield);
  }
  
  /**
   * 召唤物启用时调用 (从对象池取出时)
  */
 protected onStart(_data: ISummonInitData): void {
   // 3. 入场动画：初始 Alpha 为 0，然后渐变到 1
    this.setScale(EntityTextureScale * 1.5);
    this.setAlpha(0);
    // 也许你需要重置旋转角度
    this.setRotation(0);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 500, // 300ms 淡入
      ease: Phaser.Math.Easing.Quadratic.Out,
    });

    // 如果需要特殊的混合模式，可以在这里设置
    // this.sprite.setBlendMode(Phaser.BlendModes.ADD);
  }

  /**
   * 每帧更新
   */
  protected onUpdate(delta: number): void {
    if (!this.target) return;

    // 持续旋转效果
    this.setRotation(this.rotation + this._rotationSpeed * delta);
    const player = this.target;
    if (player && player.active) {
      // 跟随玩家位置
      this.setPosition(player.x, player.y);
    }
  }

  /**
   * 重写 destroy 方法以实现退场动画
   * SummonManager 在持续时间结束后会调用此方法
   */
  protected onDespawn(): void {
    // 如果已经处于退出状态，不再重复执行
    if (!this.active) {
      return;
    }
    // 停止之前的任何可能的 tween (比如还在淡入过程中就突然要销毁)
    this.scene.tweens.killTweensOf(this);

    // 播放退场动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500, // 300ms 淡出
      ease: Phaser.Math.Easing.Quadratic.In,
      onComplete: () => {
        // 动画完成后，调用父类的 destroy 执行真正的回收逻辑
        // 这里的 super.destroy() 会调用 this.kill() 把对象放回池子
        this.kill()
      },
    });
  }
}