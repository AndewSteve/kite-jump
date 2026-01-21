import GameScene from '../scenes/GameScene';
import { type IGamePhase } from '../phases/PhaseSystem';
import { IdlePhase, NormalPhase, TransitionPhase } from '../phases/PhasesConfig';
import { BiomeId, type IBiomeData } from '../types/BiomeTypes';
import { BiomeLibrary } from '../config/BiomeDataConfig';
import { GameConfig } from '../config/GameConfig';
import { EVENTS, gameEvents } from '../config/Events';

export default class PhaseManager {
  private scene: GameScene;
  private currentPhase: IGamePhase;
  // ✅ 新增：记录当前的生态 ID，用于去重逻辑
  private currentBiomeId: BiomeId = BiomeId.L1_Frost;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.currentPhase = new IdlePhase();
  }

  public startFirstPhase() {
    // 根据策划案：L1 是固定的
    this.currentBiomeId = BiomeId.L1_Frost;
    this.switchPhase(new NormalPhase(), BiomeLibrary[BiomeId.L1_Frost]);
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

    // ✅ 发出事件通知 UI
    // 如果是过渡态
    if (newPhase instanceof TransitionPhase) {
        gameEvents.emit(EVENTS.PHASE_TRANSITION_START);
    } 
    // 如果是正常态
    else if (newPhase instanceof NormalPhase) {
        gameEvents.emit(EVENTS.PHASE_NORMAL_START);
    }
  }

  // ✅ 核心状态机回调
  public onPhaseComplete() {
    if (this.currentPhase instanceof NormalPhase) {
      // 正常关卡结束 -> 进过渡 (固定2000米过渡，或读取配置)
      this.switchPhase(
        new TransitionPhase(GameConfig.level.transitionHeigth), 
        BiomeLibrary[this.currentBiomeId]
      );
    } 
    else if (this.currentPhase instanceof TransitionPhase) {
      // 过渡结束 -> 进下一个生态
      const nextId = this.getNextBiomeId();
      this.switchPhase(new NormalPhase(), BiomeLibrary[nextId]);
    }
  }

  private getNextBiomeId(): BiomeId {
    // 1. 定义随机池 (排除 L1，只在 L2, L3, L4 中循环)
    const pool = [BiomeId.L2_RedCliff, BiomeId.L3_CloudMarsh, BiomeId.L4_WindCave];

    // 2. 过滤掉上一次的场景 (实现"不能连续出现两次同一场景")
    // 如果当前是 L1，candidates 就是 [L2, L3, L4]
    // 如果当前是 L2，candidates 就是 [L3, L4]
    const candidates = pool.filter(id => id !== this.currentBiomeId);

    // 3. 随机取一个
    const nextId = candidates[Math.floor(Math.random() * candidates.length)];

    // 4. 更新记录
    this.currentBiomeId = nextId;

    return nextId;
  }
}