// src/managers/BuffManager.ts
import StatSystem from '../mechanics/StatSystem';
import { type IBuffConfig, BuffInstance } from '../mechanics/BuffTypes';
import { StatType, type IModifier } from '../mechanics/StatDefinitions';
import Player from '../entities/Player';
import { DashConfig } from '../config/BuffConfig';

export default class BuffManager {
  private player: Player;
  private statSystem: StatSystem;
  
  // 活跃的 Buff 列表 (支持多个同ID的 Buff 实例)
  private activeBuffs: BuffInstance[] = [];
  
  // 当前拥有的 Tag 集合 (Set 查找最快)
  public tags: Set<string> = new Set();

  constructor(player: Player, statSystem: StatSystem) {
    this.player = player;
    this.statSystem = statSystem;
  }

  // ✅ 核心：每帧更新,输入 dt 秒数
  public update(dt: number) { // dt in seconds
    // 1. 更新所有 Buff 的计时器
    this.activeBuffs.forEach(buff => {
      if (buff.config.tickInterval) {
        buff.tickAccumulator += dt;
        while (buff.tickAccumulator >= buff.config.tickInterval) {
          // 触发 Tick 行为
          if (buff.config.onTick) {
            const context = { 
              contextCancelled: false, 
              player: this.player, 
            };
            buff.config.onTick.forEach(action => {
              action.execute(context);
            });
          }
          buff.tickAccumulator -= buff.config.tickInterval;
        }
      }
      if (buff.config.duration > 0) {
        buff.timer -= dt;
        if (buff.timer <= 0) {
          this.removeBuffInstance(buff);
        }
      }
      if (buff.config.onUpdate) {
        const context = { 
          contextCancelled: false, 
          player: this.player, 
        };
        buff.config.onUpdate.forEach(action => {
          action.execute(context);
        });
      }
    });
  }

  // ✅ 添加 Buff
  public addBuff(config: IBuffConfig) {
    // 1. 检查堆叠逻辑
    const existing = this.activeBuffs.filter(b => b.config.id === config.id);
    
    if (existing.length >= config.maxStack) {
      // 策略：如果满了，通常是移除"最早会过期的"那个，腾出位置给新的
      // 或者刷新时间最短的那个。这里我们简单粗暴：移除剩余时间最少的
      existing.sort((a, b) => a.timer - b.timer);
      this.removeBuffInstance(existing[0]); 
    }

    // 2. 创建新实例 (孔明灯逻辑：这里会创建一个全新的实例，独立计时)
    const newBuff = new BuffInstance(config);

    // 特例：如果是冲刺 Buff，应用持续时间加成
    if (newBuff.config.tags 
      && newBuff.config.tags.length > 0 
      && newBuff.config.tags.includes(DashConfig.universalTag)
      && newBuff.config.duration > 0) {
      newBuff.timer += this.statSystem.get(StatType.DashDurationIncrease);
    }
    this.activeBuffs.push(newBuff);
    
    this.onBuffAdded(newBuff);
  }

  // ✅ 内部：Buff 生效逻辑
  private onBuffAdded(buff: BuffInstance) {
    // A. 应用数值修改
    if (buff.config.modifiers) {
      buff.config.modifiers.forEach(modConfig => {
        const modifier: IModifier = {
          sourceId: buff.runtimeId, // 关键：用运行时ID作为来源，方便移除
          type: modConfig.type,
          value: modConfig.value
        };
        this.statSystem.addModifier(modConfig.stat, modifier);
      });
    }

    // B. 应用 Tags (例如 WindGod)
    if (buff.config.tags) {
      buff.config.tags.forEach(tag => this.tags.add(tag));
    }

    if (buff.config.onAdd) {
      const context = { 
        player: this.player, 
        contextCancelled: false, 
      };
      buff.config.onAdd.forEach(action => {
        action.execute(context);
      });
    }
    
    console.log(`Buff Added: ${buff.config.id}`);
  }

  // ✅ 内部：Buff 移除逻辑
  private removeBuffInstance(buff: BuffInstance) {
    buff.isExpired = true;
    
    // A. 移除数值修改
    if (buff.config.modifiers) {
      buff.config.modifiers.forEach(modConfig => {
        this.statSystem.removeModifier(modConfig.stat, buff.runtimeId);
      });
    }

    if (buff.config.onRemove) {
      const context = { 
        player: this.player, 
        contextCancelled: false,
      };
      buff.config.onRemove.forEach(action => {
        action.execute(context);
      });
    }

    // B. 移除 Tags
    // 注意：如果还有其他同名 Buff (比如堆叠了2层 WindGod)，不能直接移除 Tag
    // 需要检查是否还有其他 Buff 提供了这个 Tag
    if (buff.config.tags) {
      buff.config.tags.forEach(tag => {
        // 检查剩余的 Buff 里是否还有人持有这个 Tag
        const anyoneElseHasTag = this.activeBuffs.some(
           b => b !== buff && !b.isExpired && b.config.tags?.includes(tag)
        );
        if (!anyoneElseHasTag) {
          this.tags.delete(tag);
        }
      });
    }

    // C. 从列表中剔除
    const index = this.activeBuffs.indexOf(buff);
    if (index > -1) {
      this.activeBuffs.splice(index, 1);
    }
    
    console.log(`Buff Removed: ${buff.config.id}`);
  }

  public removeByTag(tag: string) {
    const buffsToRemove = this.activeBuffs.filter(buff => 
      buff.config.tags?.includes(tag)
    );
    buffsToRemove.forEach(buff => this.removeBuffInstance(buff));
  }

  public removeBuffById(buffId: string) {
    const buffsToRemove = this.activeBuffs.filter(buff => 
      buff.config.id === buffId
    );
    buffsToRemove.forEach(buff => this.removeBuffInstance(buff));
  }

  // ✅ 查询：是否拥有某个 Tag
  public hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }
}
