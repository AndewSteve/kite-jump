import Phaser from 'phaser';
import Player from '../entities/Player';
import InteractableEntity from '../entities/InteractableEntity';
import { GameConfig } from '../config/GameConfig';
import { EntityType, type ISpawnDefinition } from '../types/GameTypes';
import type GameScene from '../scenes/GameScene';
import { KiteConfigs } from '../config/KiteConfig';



export default class SpawnManager {
  private scene: GameScene;
  private interactables: Phaser.Physics.Arcade.Group;
  private player: Player;
  
  // ✅ 移除 currentBiomeIndex, biomesIterator
  private currentTable: Record<string, ISpawnDefinition> | null = null;

  constructor(scene: GameScene, group: Phaser.Physics.Arcade.Group, player: Player) {
    this.scene = scene;
    this.interactables = group;
    this.player = player;
    this.currentTable = null;
  }

  public initClouds(worldWidth: number, _logicHeight: number) {
    for (let i = 0; i < GameConfig.level.cloudCount; i++) {
      const y = GameConfig.height / 2 - i * GameConfig.level.cloudGap;
      this.spawnRow(y, worldWidth);
    }
  }

  // ✅ 新增：由 PhaseManager 调用注入数据
  public setSpawnTable(table: Record<string, ISpawnDefinition>) {
    let finalTable = table;
    if (this.player && this.player.playerState.buffs.hasTag(KiteConfigs.wu.tag)) {
      
      // 3. 检查当前表里有没有唤风符 (如果没有就不需要操作)
      if (finalTable[KiteConfigs.wu.windSpawnKey]) {
        console.log(`[SpawnManager] 检测到东吴被动，唤风符概率翻倍！`);

        // 4. ✅ 关键：执行“写时拷贝” (Copy-on-Write)
        // 我们不能直接修改 originalTable，因为那是全局静态配置
        
        // A. 浅拷贝整个 Table 对象
        finalTable = { ...table };

        // B. 取出原始配置
        const originalDef = finalTable[KiteConfigs.wu.windSpawnKey];

        // C. 克隆该配置条目并修改权重 (防止修改到原始引用)
        finalTable[KiteConfigs.wu.windSpawnKey] = {
          ...originalDef,           // 复制 init 函数和其他属性
          weight: originalDef.weight * KiteConfigs.wu.windSpawnMultiplier // ⚡️ 翻倍 (0.02 -> 0.04)
        };
      }
    }

    this.currentTable = finalTable;
  }

  // ✅ 简化 Update：不再计算逻辑高度来切 Biome
  public update(worldWidth: number) {
    // 1. 权限检查 (PhaseManager 控制)
    if (!this.scene.phaseManager.canSpawn) return;
    if (!this.currentTable) return;

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
        this.spawnEntity(x, y);
        usedX.push(x);
      }
    }
  }

  private spawnEntity(x: number, y: number) {
    // 1. 获取当前生效的 SpawnTable
    // 如果是东吴(Wu)，我们可以在这里 clone 一份 table 并修改权重
    // 或者更高效做法：在 roll 点的时候做手脚
    
    let table = this.currentTable;
    if (!table) return; // 安全检查
    const spawnDefinitions = Object.values(table);
    
    // A. 计算总权重
        let totalWeight = 0;
        for (const def of spawnDefinitions) {
          totalWeight += def.weight;
        }
    
        // B. 随机取值
        let randomWeight = Phaser.Math.Between(0, totalWeight);
        let selectedDef = spawnDefinitions[0];
    
        // C. 遍历扣除权重
        for (const def of spawnDefinitions) {
          randomWeight -= def.weight;
          if (randomWeight <= 0) {
            selectedDef = def;
            break;
          }
        }
    
        let finalDef = selectedDef;
    
        // ✅ Lv3 风神降临逻辑：正面道具 -> 金币
        if (this.player && this.player.playerState.buffs.hasTag('State.GoldMode')) {
            // 创建一个临时的配置对象来检查类型
            const tempConfig = selectedDef.init();
            
            if (tempConfig.type === EntityType.Buff) {
                // 替换为金币 (假设 spawnTable 里有 'coin')
              finalDef.init = () => (GameConfig.entityTable['coin']());
            }
        }
    
        // ✅ 获取/创建 Cloud 实例
        // 使用 get() 可以自动利用对象池 (如果是刚被 kill 的云，会复用它)
        const entity = this.interactables.get(x, y) as InteractableEntity;
    
        if (entity) {
          // ✅ 调用 Cloud 自己的 setup 方法
          entity.setActive(true);
          entity.setVisible(true);
          entity.configure(finalDef.init());
        }
  }
}