import Phaser from 'phaser';
import Player from '../entities/Player';
import InteractableEntity from '../entities/InteractableEntity';
import { GameConfig } from '../config/GameConfig';
import { EntityType, type ISpawnDefinition } from '../types/GameTypes';
import type GameScene from '../scenes/GameScene';
import { EntityConfig } from '../config/EntityConfig';
import { WeightStat } from '../mechanics/WeightStat';
import type { IModifier } from '../mechanics/StatDefinitions';
import DataManager from '../managers/DataManager';
import { EntityIds, type EntityId } from '../config/EntityIds';

export const GroupSpawnPatterns = {
  line_vertical: 'line_vertical',
  line_horizontal: 'line_horizontal',
  sine: 'sine',
  v_shape: 'v_shape',
  arch: 'arch'
} as const;
export type GroupSpawnPattern = typeof GroupSpawnPatterns[keyof typeof GroupSpawnPatterns];

export default class SpawnManager {
  private scene: GameScene;
  private interactables: Phaser.Physics.Arcade.Group;
  private player: Player;
  // ✅ 核心改变：使用 WeightStat 管理每个 ID 的权重
  // Key: EntityId, Value: WeightStat (Base + Modifiers)
  private weightStats: Map<EntityId, WeightStat> = new Map();
  // ✅ 移除 currentBiomeIndex, biomesIterator
  // private currentTable: Record<EntityId, ISpawnDefinition> | null = null;
  // 当前 Biome 的原始定义 (用于 init 和 fallback)
  private currentDefs: Map<EntityId, ISpawnDefinition> = new Map();
  public isSpawningEnabled: boolean = false;

  // ✅ 新增：记录连续多少层没有生成 Buff (跳跃道具)
  private rowsSinceLastBuff: number = 0;

  constructor(scene: GameScene, group: Phaser.Physics.Arcade.Group, player: Player) {
    this.scene = scene;
    this.interactables = group;
    this.player = player;
    // this.currentTable = null;
  }

  public initClouds(worldWidth: number, _logicHeight: number) {
    for (let i = 0; i < GameConfig.level.cloudCount; i++) {
      const y = GameConfig.height / 2 - i * GameConfig.level.cloudGap;
      this.spawnRow(y, worldWidth);
    }
  }

  // --- 外部接口：配置管理 ---

  /**
   * 切换 Biome 时调用：设置基础生成表
   */
  public setBaseSpawnTable(table: Record<string, ISpawnDefinition>) {
    this.currentDefs.clear();

    // 1. 先把所有现存的 BaseValue 重置为 0 (防止上个 Biome 的东西残留在池子里)
    this.weightStats.forEach(stat => stat.baseValue = 0);

    // 2. 遍历新表，更新 BaseValue
    Object.entries(table).forEach(([key, def]) => {
      const entityId = key as EntityId;
      this.currentDefs.set(entityId, def);

      // 获取或创建 Stat
      let stat = this.weightStats.get(entityId);
      if (!stat) {
        stat = new WeightStat(0);
        this.weightStats.set(entityId, stat);
      }
      
      // 更新基础权重
      stat.baseValue = def.weight;
    });
  }

  /**
   * 添加权重修正 (天气、BUFF、阶段过滤)
   * value = 0.25 -> +25%
   * value = -1.0 -> -100% (Ban)
   */
  public addWeightModifier(entityId: EntityId, modifier: IModifier) {
    let stat = this.weightStats.get(entityId);
    if (!stat) {
      // 如果修改了一个当前 Biome 根本不存在的东西，我们也记录下来
      // 因为可能之后 Biome 切换了，这个 Modifier 还需要保留 (比如全屏禁金币)
      stat = new WeightStat(0);
      this.weightStats.set(entityId, stat);
    }
    stat.addModifier(modifier);
  }

  public removeWeightModifier(entityId: EntityId, sourceId: string) {
    const stat = this.weightStats.get(entityId);
    if (stat) {
      stat.removeModifier(sourceId);
    }
  }

  // ✅ 1. 精确清理接口：移除指定 Source 的所有修正
  // 比如天气结束时调用 removeModifiersBySource('weather_blizzard')
  // 过渡结束时调用 removeModifiersBySource('phase_transition')
  // 而 'passive_wu' 因为没人调用移除，就会一直存在
  public removeModifiersBySource(sourceId: string) {
    this.weightStats.forEach((stat) => {
      stat.removeModifier(sourceId);
    });
  }

  // --- 生成逻辑 ---

  // ✅ 简化 Update：不再计算逻辑高度来切 Biome
  public update(worldWidth: number) {
    // 1. 权限检查 (PhaseManager 控制)
    if (this.currentDefs.size === 0) return;

    // 2. 执行回收与生成 (逻辑保持不变，但使用 this.currentTable)
    this.recycleEntities(worldWidth);
  }

  private recycleEntities(worldWidth: number) {
    const cameraTop = this.scene.cameras.main.scrollY;

    // 强制转换为 Cloud 数组
    const activeEntities =
      this.interactables.getChildren() as InteractableEntity[];

    // --- 1. 生成新云 ---
    let minY = cameraTop;

    // 必须检查 active，因为 getChildren() 会返回对象池里所有对象（包括死的）
    if (activeEntities.length > 0) {
      activeEntities.forEach((child) => {
        if (child && child.active && child.y < minY) {
          minY = child.y;
        }
      });
    }

    // ✅ 使用 GameConfig.level.spawnBuffer 替换硬编码 100
    if (minY > cameraTop - GameConfig.level.spawnBuffer) {
      this.spawnRow(minY - GameConfig.level.cloudGap, worldWidth);
    }

    // --- 2. 回收旧云 ---
    // ✅ 使用 GameConfig.level.cleanupThreshold 替换硬编码 200
    const threshold =
      this.scene.cameras.main.scrollY +
      this.scene.scale.height +
      GameConfig.level.cleanupThreshold;

    // 过滤出：存在的、活跃的、且位置在屏幕下方的云
    const entitiesToKill = activeEntities.filter(
      (child) => child && child.active && child.y > threshold
    );
    entitiesToKill.forEach((child) => {
      child.onRecycle(this.player);
      // ✅ 使用我们刚才在 Cloud.ts 里定义的 disable 方法
      // 这会同时处理 setVisible(false), setActive(false), body.enable = false
      child.disable();

      // 注意：killAndHide 只是 helper，如果 disable 里已经写了 setVisible/setActive，这里其实可以不写
      // 但为了双重保险保留也没问题：
      this.interactables.killAndHide(child);
    });
  }

  // ✅ 核心：生成逻辑
  public spawnRow(y: number, worldWidth: number) {
    // 1. 决定这一行生成几个 (1 到 Max)
    // 你可以加个权重，让生成 1 个的概率大一点，2 个的小一点
    const count = Phaser.Math.Between(1, GameConfig.level.maxSpawnsPerRow);

    // 用于记录已占用的 X 坐标，防止重叠
    const usedX: number[] = [];

    // ✅ 1. 判断是否触发保底
    // 如果上一行也没 Buff (rows >= 1)，这行必须有
    const isPityTriggered = this.rowsSinceLastBuff >= 1;
    let hasBuffInThisRow = false;

    for (let i = 0; i < count; i++) {
      // 尝试寻找一个不重叠的 X 坐标 (最多尝试 10 次，防止死循环)
      let x = 0;
      let valid = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        x = Phaser.Math.Between(50, worldWidth - 50);

        // 检查与已有物体的距离
        let tooClose = false;
        for (const existingX of usedX) {
          if (Math.abs(x - existingX) < GameConfig.level.minSpawnDistance) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          valid = true;
          break;
        }
      }

      if (valid) {
        // ✅ 2. 决定筛选策略
        let filterType: EntityType | undefined = undefined;

        // 只有当：触发了保底 且 当前行还没生成过 Buff 时，强制筛选
        if (isPityTriggered && !hasBuffInThisRow) {
          filterType = EntityType.Buff;
        }

        // ✅ 3. 调用生成 (可能返回 null，比如强制筛选 Buff 但当前池子里没有 Buff)
        const spawnedId = this.spawnEntity(x, y, filterType);

        if (spawnedId) {
          // ✅ 4. 检查实际生成的是否是 Buff，更新标记
          const config = EntityConfig[spawnedId]();
          if (config.type === EntityType.Buff) {
            hasBuffInThisRow = true;
          }
        }
        
        usedX.push(x);
      }
    }

    // ✅ 5. 更新计数器
    if (hasBuffInThisRow) {
      this.rowsSinceLastBuff = 0; // 重置
    } else {
      this.rowsSinceLastBuff++; // 累加
    }
  }

  private spawnEntity(x: number, y: number, filterType?: EntityType): EntityId | null {
    // A. 动态计算总权重 (Logic Driven)
    const candidates: { id: EntityId, finalWeight: number }[] = [];
    let totalWeight = 0;
    
    // 遍历所有有权重的 Stat
    this.weightStats.forEach((stat, id) => {
        const w = stat.getValue();
        if (w > 0) {
            // ✅ 核心逻辑：如果指定了筛选类型，检查该 ID 是否符合类型
            if (filterType) {
              // 必须去 EntityConfig 拿原始配置来看类型
              // (注意：这里假设 EntityConfig[id] 一定存在，且开销可接受)
              const configFactory = EntityConfig[id];
              if (configFactory) {
                const tempConfig = configFactory();
                if (tempConfig.type !== filterType) {
                  return; // 类型不匹配，跳过，不加入候选列表
                }
              }
            }

            candidates.push({ id, finalWeight: w });
            totalWeight += w;
        }
    });
    
    if (totalWeight <= 0 || candidates.length === 0) return null;
    
    // B. 随机取值
    let randomWeight = Phaser.Math.Between(0, totalWeight);
    
    let selectedId = candidates[0].id;
    for (const candidate of candidates) {
      randomWeight -= candidate.finalWeight;
      if (randomWeight <= 0) {
        selectedId = candidate.id;
        break;
      }
    }

    // C. 获取配置工厂
    // 注意：如果 Stat 里有权重，但 currentDefs 里没定义（比如纯依靠 Modifier 刷出来的东西），
    // 我们需要直接去 EntityConfig 拿默认定义。
    let def = this.currentDefs.get(selectedId);
    let initFactory = def ? def.init : EntityConfig[selectedId];

    if (!initFactory) {
        console.warn(`[SpawnManager] No config found for ${selectedId}`);
        return null;
    }

    // ✅ 保留替换操作 (Gold Mode)
    // 这种复杂的逻辑替换，依然很难用纯数值抽象，保留 if 逻辑是最务实的
    if (this.player && this.player.playerState.buffs.hasTag('State.GoldMode')) {
        const tempConfig = initFactory();
        if (tempConfig.type === EntityType.Buff) {
            initFactory = EntityConfig[EntityIds.Coin]; // 使用 ID 访问
        }
    }

    const coinCheck = initFactory();
    if (coinCheck.type === EntityType.Coin) {
      const patterns: GroupSpawnPattern[] = [
        GroupSpawnPatterns.line_vertical,
        GroupSpawnPatterns.line_horizontal,
        GroupSpawnPatterns.sine,
        GroupSpawnPatterns.v_shape,
        GroupSpawnPatterns.arch
      ];
      const pattern = Phaser.Math.RND.pick(patterns);
      const count = Phaser.Math.Between(3, 8);
      this.spawnGroup(EntityIds.Coin, x, y, pattern, count);
      DataManager.markEntitySeen(EntityIds.Coin);
      return null;
    }

    // D. 实例化
    const entity = this.interactables.get(x, y) as InteractableEntity;
    if (entity) {
      entity.setActive(true);
      entity.setVisible(true);
      entity.configure(initFactory());
      entity.onSpawn(this.player);
      DataManager.markEntitySeen(selectedId);
      return selectedId; // ✅ 返回生成的 ID
    }

    return null;
  }

  /**
   * ✅ 新增：生成一组实体 (阵型生成)
   * @param entityId 实体ID
   * @param startX 屏幕/世界 X 坐标 (中心点或起始点)
   * @param startY 屏幕/世界 Y 坐标
   * @param pattern 'line' | 'sine' | 'arch' | 'v_shape'
   * @param count 数量
   */
  public spawnGroup(entityId: EntityId, startX: number, startY: number, pattern: GroupSpawnPattern, count: number = 5) {
    const gap = 60; // 间距
    const configFactory = EntityConfig[entityId];
    if (!configFactory) return;

    for (let i = 0; i < count; i++) {
      let x = startX;
      let y = startY;

      // --- 简单的阵型数学计算 ---
      switch (pattern) {
        case GroupSpawnPatterns.line_vertical: // 竖排 (经典吃金币)
          y = startY - i * gap; 
          break;
          
        case GroupSpawnPatterns.line_horizontal: // 横排
           // 居中偏移
           const totalWidth = (count - 1) * gap;
           x = startX - totalWidth / 2 + i * gap;
           break;

        case GroupSpawnPatterns.sine: // 正弦波 (蛇形)
          y = startY - i * gap;
          x = startX + Math.sin(i * 0.5) * 100; // 100是摆动幅度
          break;
          
        case GroupSpawnPatterns.v_shape: // V字形 (雁阵)
          const offset = Math.abs(i - Math.floor(count / 2));
          x = startX + (i - Math.floor(count / 2)) * gap;
          y = startY - offset * gap * 0.5;
          break;

        case GroupSpawnPatterns.arch: // 拱形
          const t = count <= 1 ? 0 : i / (count - 1); // 0..1
          const archTotalWidth = (count - 1) * gap;
          x = startX - archTotalWidth / 2 + i * gap;
          y = startY - Math.sin(t * Math.PI) * 120;
          break;
      }

      // 边界保护
      x = Phaser.Math.Clamp(x, 50, this.scene.scale.width - 50);

      // 实例化
      const entity = this.interactables.get(x, y) as InteractableEntity;
      if (entity) {
        entity.setActive(true);
        entity.setVisible(true);
        entity.configure(configFactory());
        entity.onSpawn(this.player);
      }
    }
  }
}
