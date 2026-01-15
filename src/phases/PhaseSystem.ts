import GameScene from '../scenes/GameScene';
import type { IBiomeData } from '../types/BiomeTypes';

// 阶段接口
export interface IGamePhase {
  // 进入阶段时触发 (初始化特效、锁定输入等)
  onEnter(scene: GameScene, data: IBiomeData): void;

  // 每一帧更新 (处理该阶段特有的物理或逻辑)
  update(scene: GameScene, dt: number): void;

  // 离开阶段时触发 (清理特效、解锁输入)
  onExit(scene: GameScene): void;

  // 询问该阶段是否允许生成障碍物
  canSpawnEntities(): boolean;
  
  // 询问该阶段是否允许玩家控制
  isInputEnabled(): boolean;
}