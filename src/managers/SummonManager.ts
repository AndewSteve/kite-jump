import Phaser from 'phaser';
import { BaseSummon, type SpaceType, type ISummonInitData } from '../entities/summons/BaseSummon';
import GameScene from '../scenes/GameScene';
import { SummonConfig, SummonId } from '../config/SummonConfig';

// 注册表类型定义
type SummonClass = new (scene: Phaser.Scene, x: number, y: number) => BaseSummon;

interface IPrefabConfig {
  classType: SummonClass;
  defaultSpace: SpaceType;
  poolSize: number;
}

export default class SummonManager {
  private scene: GameScene;
  
  // 对象池字典：Key -> Group
  private pools: Map<string, Phaser.GameObjects.Group> = new Map();
  
  // 配置字典
  private configs: Map<string, IPrefabConfig> = new Map();

  constructor(scene: GameScene) {
    this.scene = scene;
    // ✅ 构造时自动初始化所有配置
    this.initRegistry();
  }

  // ✅ 遍历配置表进行注册
  private initRegistry() {
    Object.entries(SummonConfig).forEach(([key, def]) => {
      this.register(key, def.classType, def.space, def.poolSize);
    });
    console.log(`[SummonManager] Registered ${this.pools.size} summon types.`);
  }

  /**
   * 注册 Prefab (类似于把 Prefab 拖到 Inspector 变量里)
   */
  public register(key: string, cls: SummonClass, space: SpaceType = 'world', poolSize: number = 5) {
    this.configs.set(key, {
      classType: cls,
      defaultSpace: space,
      poolSize: poolSize
    });

    // 预热对象池
    const group = this.scene.add.group({
      classType: cls,
      maxSize: poolSize,
      runChildUpdate: true // ✅ 关键：确保 preUpdate 被调用
    });
    
    // 实例化物理
    // 注意：需要在 createCallback 里启用物理，或者由类自己处理
    this.pools.set(key, group);
  }

  /**
   * 实例化 (Unity: Instantiate)
   */
  public summon(key: SummonId | string, x: number, y: number, options?: Partial<ISummonInitData>) {
    const group = this.pools.get(key);
    const config = this.configs.get(key);

    if (!group || !config) {
      console.warn(`Summon key not registered: ${key}`);
      return null;
    }

    // 从对象池获取
    const entity = group.get(x, y) as BaseSummon;
    
    if (entity) {
      // 确保物理组件存在 (如果是首次创建)
      // 设置空间
      entity.setSpaceType(config.defaultSpace);

      // 初始化
      const initData: ISummonInitData = {
        x, y,
        target: this.scene.player, // 默认注入 Player
        ...options
      };
      
      entity.onSpawn(initData);
    }
    
    return entity;
  }

  /**
   * ✅ 新增：查询当前场上某种召唤物的活跃数量
   * 用于 Action 判断是否要生成新的 (比如落雷逻辑：场上只能有一道雷)
   */
  public getActiveCount(key: SummonId | string): number {
    const group = this.pools.get(key);
    if (!group) return 0;
    
    // countActive(true) 返回所有 active = true 的成员数量
    return group.countActive(true);
  }

  /**
   * ✅ 新增：清理场上所有召唤物
   * 通常在 Phase 切换时调用
   */
  public clearAll() {
    this.pools.forEach((group) => {
      // 遍历所有活跃的成员
      group.getChildren().forEach((child) => {
        const entity = child as BaseSummon;
        if (entity.active) {
            // 调用 despawn 让它们优雅退场 (Fade Out)
            // 或者如果你想瞬间清除，可以直接 entity.setActive(false).setVisible(false)...
            // 这里我们选择优雅退场
            entity.despawn();
        }
      });
    });
    console.log("[SummonManager] All entities cleared.");
  }
}
