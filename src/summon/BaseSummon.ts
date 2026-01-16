import Phaser from 'phaser';
import Player from '../entities/Player';

export const SpaceType = {
  World: 'world',
  Screen: 'screen'
} as const;
export type SpaceType = typeof SpaceType[keyof typeof SpaceType];

export interface ISummonInitData {
  x: number;
  y: number;
  lifeTime?: number; // 存活时间 (秒)，-1 为永久
  target?: Player;   // 传入玩家引用，方便做碰撞检测
  customData?: any;  // 任意额外参数
}

/**
 * 类似于 Unity 的 MonoBehaviour (针对召唤物)
 */
export abstract class BaseSummon extends Phaser.Physics.Arcade.Sprite {
  protected lifeTimer: number = 0;
  protected maxLifeTime: number = -1;
  protected target: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    // 注册到 Update 列表 (类似于 Unity 的 Update)
    // 注意：如果是 Group 里的成员，runChildUpdate 需要为 true
  }

  /**
   * 类似于 Unity 的 Start/Awake，每次从对象池取出时调用
   */
  public onSpawn(data: ISummonInitData) {
    this.setActive(true);
    this.setVisible(true);
    this.body!.enable = true; // 确保物理开启
    
    this.setPosition(data.x, data.y);
    this.lifeTimer = 0;
    this.maxLifeTime = data.lifeTime ?? -1;
    this.target = data.target || null;

    // 重置物理状态
    this.setVelocity(0, 0);
    this.setAcceleration(0, 0);
    this.setAlpha(1);
    this.setScale(1);

    // 触发子类初始化
    this.onStart(data);
  }

  /**
   * 设置坐标空间 (Unity: Screen Space Overlay vs World Space)
   */
  public setSpaceType(space: SpaceType) {
    if (space === 'screen') {
      this.setScrollFactor(0); // 0 = 锁定在屏幕 (UI空间/相机空间)
    } else {
      this.setScrollFactor(1); // 1 = 跟随世界 (世界空间)
    }
  }

  /**
   * 类似于 Unity Update
   */
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    
    // 自动销毁逻辑
    if (this.maxLifeTime > 0) {
      this.lifeTimer += delta / 1000;
      if (this.lifeTimer >= this.maxLifeTime) {
        this.despawn();
      }
    }

    this.onUpdate(delta);
  }

  public despawn() {
    // this.setActive(false);
    // this.setVisible(false);
    if (this.body) this.body.enable = false;
    this.onDespawn();
    // 如果是 Group 管理的，这里不需要 destroy，只需要 setActive(false) 等待复用
  }

  // --- 供子类覆盖的生命周期 ---
  protected abstract onStart(data: ISummonInitData): void;
  protected abstract onUpdate(dt: number): void;
  protected onDespawn(): void {}
}