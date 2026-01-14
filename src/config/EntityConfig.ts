import { BoostAction, DashEnergyIncrementAction, ScoreAction, SlowDownAction, VanishAction } from "../actions/GameActions";
import { EntityType, type ISpawnDefinition } from "../types/GameTypes";



export const EntityConfig: Record<string, ISpawnDefinition> = {
  normal_cloud: {
      weight: 70,
      init: () => ({
        texture: 'cloud',
        type: EntityType.Buff, // ✅ 有益
        color: 0xffffff,
        actions: [
          new BoostAction(-900), // 普通力度
          new DashEnergyIncrementAction(20), // 增加冲刺能量
          new VanishAction()     // 踩了消失
        ]
      })
    },
    purple_cloud: {
      weight: 20,
      init: () => ({
        texture: 'cloud',
        type: EntityType.Buff, // ✅ 有益
        color: 0xbd00ff,
        actions: [
          new BoostAction(-1000), // 大力度
          new VanishAction()
        ]
      })
    },
    red_cloud: {
      weight: 1,
      init: () => ({
        texture: 'cloud',
        type: EntityType.Buff, // ✅ 有益
        color: 0xff0000,
        actions: [
          new BoostAction(-2000), // 超级力度
          new VanishAction()
        ]
      })
    },
    coin: {
      weight: 10,
      init: () => ({
        texture: 'cloud',
        type: EntityType.Buff, // ✅ 有益
        color: 0xffd700,
        actions: [
          new ScoreAction(200),           
          new VanishAction()
        ]
      })
    },
    cold_cloud: {
      weight: 10,
      init: () => ({
        texture: 'cloud',
        type: EntityType.Hazard, // ✅ 危险
        color: 0x00ffff,
        actions: [
          new SlowDownAction(-800/3),     // 强制减速
          new ScoreAction(-50),           // 踩到陷阱扣分
          new VanishAction()
        ]
      })
    },
}