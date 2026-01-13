import Phaser from 'phaser';
import { type CloudTypeConfig } from '../types/GameTypes'; // 确保路径正确

export default class Cloud extends Phaser.Physics.Arcade.Sprite {
  // 状态锁
  public canBoost: boolean = true;
  // 加速值
  public boostForce: number = 0;

  // ✅ Getter 保持类型安全
  public get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'cloud');
  }

  /**
   * 初始化/重置云朵状态 (用于对象池复用或新建时配置)
   * @param typeConfig 从配置表读取的类型数据
   */
  public setup(typeConfig: CloudTypeConfig) {
    // 1. 物理属性
    // 注意：这里需要断言 body 存在，或者在 scene create 时统一开启
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.enable = true; // 复活物理体
    }

    // 2. 视觉属性
    this.setTint(typeConfig.color);
    this.setScale(1);
    this.setAlpha(1);
    this.setVisible(true);
    this.setActive(true); // ✅ 确保激活

    // 3. 游戏逻辑属性
    this.canBoost = true;
    this.boostForce = typeConfig.boost;
  }

  /**
   * 被玩家撞击时的逻辑
   */
  public hit() {
    if (!this.canBoost) return;

    this.canBoost = false;
    
    // 关闭物理检测
    if (this.body) {
        this.body.enable = false;
    }

    // 播放消失动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,        // ✅ 你要求的透明度变化
      scaleX: 1.2,     // 稍微变大再消失
      scaleY: 1.2,
      duration: 150,   // 动画时间
      onComplete: () => {
        this.disable(); // ✅ 动画播完也可以调用 disable
      }
    });
  }

  // ✅✅✅ 必须添加这个方法，recycleClouds 才能调用
  public disable() {
      this.setVisible(false);
      this.setActive(false); // 标记为非活跃，对象池需要
      if (this.arcadeBody) {
          this.arcadeBody.enable = false; // 关闭物理
      }
  }
}