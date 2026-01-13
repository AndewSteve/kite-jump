
import { BoostAction, ScoreAction, SlowDownAction, VanishAction } from "../actions/GameActions";
import type { ISpawnDefinition } from "../types/GameTypes";



export const EntityConfig: Record<string, ISpawnDefinition> = {
  normal_cloud: {
      weight: 70,
      init: () => ({
        texture: 'cloud',
        color: 0xffffff,
        actions: [
          new BoostAction(-800, 5), // 普通力度
          new VanishAction()     // 踩了消失
        ]
      })
    },
    purple_cloud: {
      weight: 20,
      init: () => ({
        texture: 'cloud',
        color: 0xbd00ff,
        actions: [
          new BoostAction(-1000, 10), // 大力度
          new VanishAction()
        ]
      })
    },
    red_cloud: {
      weight: 10,
      init: () => ({
        texture: 'cloud',
        color: 0xff0000,
        actions: [
          new BoostAction(-1500, 20), // 超级力度
          new VanishAction()
        ]
      })
    },
    golden_cloud: {
      weight: 10,
      init: () => ({
        texture: 'cloud',
        color: 0xffd700,
        actions: [
          new ScoreAction(200),           // 踩到陷阱扣分
          new VanishAction()
        ]
      })
    },
    cold_cloud: {
      weight: 10,
      init: () => ({
        texture: 'cloud',
        color: 0x00ffff,
        actions: [
          new SlowDownAction(-800/3, 15), // 强制减速且增加 15 点寒冷
          new ScoreAction(-50),           // 踩到陷阱扣分
          new VanishAction()
        ]
      })
    },
}