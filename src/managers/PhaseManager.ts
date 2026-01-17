import GameScene from '../scenes/GameScene';
import { type IGamePhase } from '../phases/PhaseSystem';
import { IdlePhase, NormalPhase, TransitionPhase } from '../phases/PhasesConfig';
import { BiomeId, type IBiomeData } from '../types/BiomeTypes';
import { BiomeLibrary } from '../config/BiomeDataConfig';
import { GameConfig } from '../config/GameConfig';

export default class PhaseManager {
  private scene: GameScene;
  private currentPhase: IGamePhase;
  private biomeQueue: BiomeId[] = []; // 待播放列表

  constructor(scene: GameScene) {
    this.scene = scene;
    this.currentPhase = new IdlePhase();
  }

  public startFirstPhase() {
    // 根据策划案：L1 是固定的
    this.switchPhase(new NormalPhase(), BiomeLibrary[BiomeId.L1_Frost]);
    
    // 预设接下来的顺序 (或者动态生成)
    // 示例：L1 -> L3 -> L2/L4 随机
    // this.biomeQueue = [BiomeId.L2_RedCliff];
    this.biomeQueue = [BiomeId.L3_CloudMarsh];
  }

  public update(dt: number) {
    if (this.currentPhase) {
        this.currentPhase.update(this.scene, dt);
    }
  }

  public switchPhase(newPhase: IGamePhase, data: IBiomeData) {
    this.currentPhase.onExit(this.scene);
    this.currentPhase = newPhase;
    this.currentPhase.onEnter(this.scene, data);
  }

  // ✅ 核心状态机回调
  public onPhaseComplete() {
    if (this.currentPhase instanceof NormalPhase) {
      // 正常关卡结束 -> 进过渡 (固定2000米过渡，或读取配置)
      this.switchPhase(
        new TransitionPhase(GameConfig.level.transitionHeigth), 
        BiomeLibrary[BiomeId.L3_CloudMarsh]
      );
    } 
    else if (this.currentPhase instanceof TransitionPhase) {
      // 过渡结束 -> 进下一个生态
      const nextId = this.getNextBiomeId();
      this.switchPhase(new NormalPhase(), BiomeLibrary[nextId]);
    }
  }

  private getNextBiomeId(): BiomeId {
    // 1. 如果队列里有，优先取队列 (实现策划说的 L1 -> L3 固定流程)
    if (this.biomeQueue.length > 0) {
      return this.biomeQueue.shift()!;
    }

    // 2. 队列空了，随机 L2 或 L4
    return Math.random() > 0.5 ? BiomeId.L3_CloudMarsh : BiomeId.L3_CloudMarsh;
  }
}