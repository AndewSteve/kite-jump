import Phaser from 'phaser';
import { GameConfig } from '../config/consts';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  // ✅ 类型安全 Getter：从此告别 this.body!
  private get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'kite');

    // 1. 将自己添加到场景和物理世界中
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 2. 初始化物理属性 (从配置读取)
    this.setCollideWorldBounds(false); // 允许飞出屏幕
    this.setDragX(GameConfig.player.dragX);
    
    // 设置最大速度 (注意：X轴受限，Y轴上升飞快但下落受限)
    // 这里我们先设一个巨大的Y上限，具体的下落限制在 update 里做
    this.setMaxVelocity(GameConfig.player.moveSpeed, GameConfig.player.maxFlySpeed);

    // 3. 初始化输入
    // 注意：这里假设键盘必然存在。如果是移动端触摸，可以在这里扩展触摸逻辑
    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

  /**
   * 每一帧自动调用 (需要在 Scene 的 update 中手动触发)
   */
  update() {
    // A. 物理限制：手动限制最大下落速度 (Terminal Velocity)
    if (this.arcadeBody.velocity.y > GameConfig.player.maxFallSpeed) {
      this.setVelocityY(GameConfig.player.maxFallSpeed);
    }

    // B. 输入控制
    if (this.cursors.left.isDown) {
      this.setAccelerationX(-GameConfig.player.acceleration);
      this.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.setAccelerationX(GameConfig.player.acceleration);
      this.setFlipX(false);
    } else {
      this.setAccelerationX(0);
    }

    // C. 穿墙逻辑 (Screen Wrap)
    this.checkScreenWrap();
  }

  /**
   * 穿墙逻辑封装
   */
  private checkScreenWrap() {
    const halfWidth = this.width / 2;
    const screenWidth = this.scene.scale.width;

    if (this.x < -halfWidth) {
      this.x = screenWidth + halfWidth;
    } else if (this.x > screenWidth + halfWidth) {
      this.x = -halfWidth;
    }
  }

  /**
   * 提供给外部调用的：被弹起/加速
   */
  public boost(force: number) {
    // ✅ 逻辑修正：防止减速
    // Phaser中向上是负数，越小越快。
    // 如果当前速度是 -1000，目标是 -600，我们应该保留 -1000。
    // Math.min(-1000, -600) = -1000 (保留更快的速度)
    // 如果当前速度是 200 (下落)，目标是 -600，Math.min(200, -600) = -600 (起飞)
    const currentVel = this.arcadeBody.velocity.y;
    this.setVelocityY(Math.min(currentVel, force));
  }

  /**
   * 提供给外部调用的：设置激活状态
   * 用于游戏开始前暂停，或结束后冻结
   */
  public setEnabled(isEnabled: boolean) {
    // 开启/关闭物理模拟
    if (this.arcadeBody) {
        this.arcadeBody.enable = isEnabled;
        this.arcadeBody.setAllowGravity(isEnabled);
    }
    
    // 显隐控制 (可选)
    this.setVisible(isEnabled ? true : this.visible);
  }
}