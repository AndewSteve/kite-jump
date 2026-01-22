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
  // 1. 能量条
  energyBarOffset: { x: number, y: number }; // y 现在代表能量条【底部】的位置
  // 缩放参数 (解决贴图偏小的问题)
  energyBarScale: { x: number, y: number };

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
  energyBarOffset: { x: 20, y: 80 }, // y 现在代表能量条【底部】的位置
  energyBarScale: { x: 1.2, y: 1.5 },

  // 指针安装位置 (比如表盘中心在背景的下方)
  pointerPosOffset: { x: 27, y: 150 },

  // 指针旋转轴心：假设旋钮在图片顶部中间，y 可能是 0.1 或 0.2
  pointerOrigin: { x: 0.555, y: 0.24 },

  minAngle: -15, // 起始角度
  maxAngle: 165, // 结束角度
  maxSpeed: 2100,
};

export class SciFiGauge extends Phaser.GameObjects.Container {
  private frame!: Phaser.GameObjects.Image;
  private frameBack!: Phaser.GameObjects.Image;
  private energyBar!: Phaser.GameObjects.Image;
  private pointer!: Phaser.GameObjects.Image;

  private config: GaugeConfig;
  private currentSpeed: number = 0;
  private currentEnergy: number = 0;
  // ✅ 视觉数值 (动画过程中的数值，用于作为下一次动画起点)
  private displayedEnergy: number = 0;

  // ✅ 新增：记录能量条的原始 Y 坐标，用于计算下沉偏移量
  private baseBottomY: number = 0;

  // ✅ 存储当前的能量动画对象，防止冲突
  private energyTween?: Phaser.Tweens.Tween;

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
    // 初始化视觉状态 (0能量)
    this.updateEnergyVisuals(0);
    this.setSpeed(0, true); // 初始化速度为0
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
    this.energyBar.setOrigin(0.5, 1);
    this.energyBar.setScale(this.config.energyBarScale.x, this.config.energyBarScale.y);
    // 记录一下初始设定的底部位置，作为后续计算的基准
    this.baseBottomY = this.config.energyBarOffset.y;
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
     * 支持动画过渡
     * @param value 目标能量值
     * @param instant 是否瞬间设置 (无动画)
     */
    public setEnergy(value: number, instant: boolean = false) {
        const targetValue = Phaser.Math.Clamp(value, 0, 1);
        
        // 更新逻辑数值 (立即生效，防止快速调用时逻辑出错)
        this.currentEnergy = targetValue;

        // 如果之前的动画还在跑，先停掉
        if (this.energyTween) {
            this.energyTween.stop();
            this.energyTween = undefined;
        }

        if (instant) {
            // 瞬间切换：直接计算并渲染
            this.updateEnergyVisuals(targetValue);
            this.displayedEnergy = targetValue;
        } else {
            // 动画切换：使用 Counter Tween 从【当前显示值】过渡到【目标值】
            this.energyTween = this.scene.tweens.addCounter({
                from: this.displayedEnergy,
                to: targetValue,
                duration: 500, // 液体流动通常比指针慢一点，显得有质感
                ease: 'Cubic.easeOut', // 液体使用 Cubic 或 Quad 比较自然，不要用 Back (会溢出)
                onUpdate: (tween) => {
                    const val = tween.getValue();
                    if (val) {
                      this.updateEnergyVisuals(val);
                      this.displayedEnergy = val; // 实时记录，以便半途打断时能接上
                    }
                }
            });
        }
    }

  /**
     * ✅ 核心渲染逻辑提取
     * 根据输入的能量百分比，计算 Y 轴下沉量和裁切区域
     */
    private updateEnergyVisuals(percent: number) {
        // 获取原始尺寸
        const texW = this.energyBar.width;
        const texH = this.energyBar.height;
        
        // 获取缩放后的实际高度
        const scaledTotalH = texH * this.config.energyBarScale.y;

        // 1. 计算【可视高度】
        const visibleDisplayH = scaledTotalH * percent;

        // 2. 计算【下沉距离】(移动 offset)
        const dropDistance = scaledTotalH - visibleDisplayH;

        // 3. 应用位置下沉 (锚点在底部)
        this.energyBar.y = this.baseBottomY + dropDistance;

        // 4. 计算【裁切】(Crop 基于原始纹理坐标)
        // 保留顶部 percent% 的区域
        const cropH = texH * percent;
        
        // 防止 cropH 为 0 或负数导致报错 (虽然 Phaser 通常能处理)
        if (cropH <= 0) {
            this.energyBar.setVisible(false);
        } else {
            this.energyBar.setVisible(true);
            this.energyBar.setCrop(0, 0, texW, cropH);
        }
        
        // 5. 颜色反馈 (可选)：低能量闪烁或变色
        if (percent < 0.2 && percent > 0) {
            this.energyBar.setTint(0xff5555); // 红色预警
        } else {
            this.energyBar.clearTint();
        }
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

  public getLogicEnergy(): number {
    return this.currentEnergy;
  }
}
