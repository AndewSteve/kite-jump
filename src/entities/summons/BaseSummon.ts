import Phaser from 'phaser';
import Player from '../Player';

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
export abstract class BaseSummon extends Phaser.GameObjects.Sprite {
  protected isDespawning: boolean = false; // ✅ 移到基类，统一管理状态
  protected lifeTimer: number = 0;
  protected maxLifeTime: number = -1;
  protected target: Player | null = null;
  protected spaceType: SpaceType = SpaceType.World;
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
    this.isDespawning = false; // ✅ 关键：复活时重置状态
    
    this.setPosition(data.x, data.y);
    this.lifeTimer = 0;
    this.maxLifeTime = data.lifeTime ?? -1;
    this.target = data.target || null;

    this.setAlpha(1);
    this.setScale(1);

    // 触发子类初始化
    this.onStart(data);
  }

  /**
   * 设置坐标空间 (Unity: Screen Space Overlay vs World Space)
   */
  public setSpaceType(space: SpaceType) {
    this.spaceType = space;
    if (space === SpaceType.Screen) {
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
    // 如果正在退场中，就不要再触发时间的 despawn 了
    // if (this.isDespawning && this.spaceType !== SpaceType.World) return;
    
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
    if (this.isDespawning) return; // 防止重复调用
    this.isDespawning = true; // 锁定状态

    // ⛔️ 不要在这里 setActive(false)！
    // 而是把决定权交给子类钩子
    this.onDespawn();
  }

  /**
   * ✅ 终结技：真正让物体消失并回收
   * 这个方法应该由 onDespawn 的实现者在事情办完后调用
   */
  protected kill() {
    this.setActive(false);
    this.setVisible(false);
    // 状态已在 onSpawn 重置，这里不需要改 isDespawning
    console.log(`[BaseSummon] ${this.constructor.name} returned to pool.`);
  }

  // --- 供子类覆盖的生命周期 ---
  protected abstract onStart(data: ISummonInitData): void;
  protected abstract onUpdate(dt: number): void;
  /**
   * 子类重写此方法来处理退场逻辑。
   * ⚠️ 必须在逻辑结束后手动调用 this.kill()！
   */
  protected onDespawn(): void {
    // 默认行为：没有动画，直接死
    this.kill();
  }
}
