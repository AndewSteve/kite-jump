import { UITextureKeys } from "../config/AssetKeys";

/**
 * 仪表盘配置接口
 * 用于在不修改核心逻辑的情况下调整美术资源的偏移量
 */
export interface GaugeConfig {
  // 资源 Key
  frameKey: string;
  frameBackKey: string;
  energyBarKey: string;
  pointerKey: string;

  // 布局微调参数
  // 1. 能量条相对于 Frame 中心的位置
  energyBarOffset: { x: number; y: number };

  // 2. 指针相对于 Frame 中心的位置
  pointerPosOffset: { x: number; y: number };

  // 3. 指针自身的旋转中心 (0-1)，比如 (0.5, 0.5) 是图片中心
  // 你的指针头部很大，重心可能偏上，需要调整这里
  pointerOrigin: { x: number; y: number };

  // 4. 指针角度范围 (度数)
  // 假设 -180 是左，0 是上，90 是右
  minAngle: number;
  maxAngle: number;

  maxSpeed: number; // 最大速度数值，默认 2000
}

// 默认配置 (请根据你的贴图实际像素位置修改这些值)
const DEFAULT_CONFIG: GaugeConfig = {
  frameKey: UITextureKeys.UIEnergyFrame,
  frameBackKey: UITextureKeys.UIEnergyFrameBack,
  pointerKey: UITextureKeys.UIEnergyPointer,
  energyBarKey: UITextureKeys.UIEnergyFill,

  // 默认放在容器中心
  energyBarOffset: { x: 20, y: -25 },

  // 指针安装位置 (比如表盘中心在背景的下方)
  pointerPosOffset: { x: 27, y: 150 },

  // 指针旋转轴心：假设旋钮在图片顶部中间，y 可能是 0.1 或 0.2
  pointerOrigin: { x: 0.555, y: 0.24 },

  minAngle: -15, // 起始角度
  maxAngle: 165, // 结束角度
  maxSpeed: 2000,
};

export class SciFiGauge extends Phaser.GameObjects.Container {
  private frame!: Phaser.GameObjects.Image;
  private frameBack!: Phaser.GameObjects.Image;
  private energyBar!: Phaser.GameObjects.Image;
  private pointer!: Phaser.GameObjects.Image;

  private config: GaugeConfig;
  private currentSpeed: number = 0;
  private currentEnergy: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: Partial<GaugeConfig> = {},
  ) {
    super(scene, x, y);

    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.createChildren();
    scene.add.existing(this);
  }

  private createChildren() {
    // 1. 背景框 (作为基准，居中)
    this.frameBack = this.scene.add.image(0, 0, this.config.frameBackKey);
    this.add(this.frameBack);
    // 2. 能量条
    this.energyBar = this.scene.add.image(
      this.config.energyBarOffset.x,
      this.config.energyBarOffset.y,
      this.config.energyBarKey,
    );
    this.energyBar.setScale(1.0/0.8,1.0 / 0.7); // 如果图是 80px 高，拉伸到 100px 高
    this.add(this.energyBar);
    this.frame = this.scene.add.image(0, 0, this.config.frameKey);
    this.add(this.frame);


    // 3. 指针
    this.pointer = this.scene.add.image(
      this.config.pointerPosOffset.x,
      this.config.pointerPosOffset.y,
      this.config.pointerKey,
    );
    // 关键：设置旋转轴心 (Anchor)
    this.pointer.setOrigin(
      this.config.pointerOrigin.x,
      this.config.pointerOrigin.y,
    );
    this.pointer.setAngle(this.config.minAngle); // 初始角度
    this.add(this.pointer);
  }

  // ==========================================
  // 公开接口：设置数据
  // ==========================================

  /**
   * 设置速度 (0 - 2000)
   */
  public setSpeed(value: number, instant: boolean = false) {
    const clamped = Phaser.Math.Clamp(value, 0, this.config.maxSpeed);
    this.currentSpeed = clamped;

    // 计算目标角度
    const percent = this.currentSpeed / this.config.maxSpeed;
    const targetAngle = Phaser.Math.Linear(
      this.config.minAngle,
      this.config.maxAngle,
      percent,
    );

    if (instant) {
      this.pointer.setAngle(targetAngle);
    } else {
      this.scene.tweens.add({
        targets: this.pointer,
        angle: targetAngle,
        duration: 300,
        ease: "Back.easeOut",
      });
    }
  }

  /**
   * 设置能量 (0.0 - 1.0)
   * 从底部向上涨
   */
  public setEnergy(value: number) {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    this.currentEnergy = clamped;

    const w = this.energyBar.width;
    const h = this.energyBar.height;

    // 计算可见高度
    const visibleHeight = h * clamped;

    // setCrop(x, y, width, height)
    // x, y 是相对于纹理左上角的。
    // 为了显示底部，我们需要裁剪掉顶部的区域。
    // y = 总高度 - 可见高度 (这样裁剪框就落在了图片底部)
    this.energyBar.setCrop(0, h - visibleHeight, w, visibleHeight);
  }

  // ==========================================
  // 调试接口：运行时调整位置 (开发阶段使用)
  // ==========================================

  /**
   * 调整指针的旋转轴心 (Origin)
   * @param x 0-1 (0是左, 1是右)
   * @param y 0-1 (0是顶, 1是底)
   */
  public debugSetPointerOrigin(x: number, y: number) {
    this.pointer.setOrigin(x, y);
    console.log(`Pointer Origin Set: { x: ${x}, y: ${y} }`);
  }

  /**
   * 调整指针在背景板上的位置
   */
  public debugSetPointerPosition(offsetX: number, offsetY: number) {
    this.pointer.setPosition(offsetX, offsetY);
    console.log(`Pointer Position Set: { x: ${offsetX}, y: ${offsetY} }`);
  }
}
