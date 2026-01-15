import { ApplyBuffAction, BoostAction, ColdnessIncrementAction, DashEnergyIncrementAction, ScoreAction, SlowDownAction, VanishAction } from "../actions/EntityActions";
import { WeiConversionAction } from "../actions/MechanicActions";
import { EntityType, type IEntityConfig} from "../types/GameTypes";
import { SkyLaternBuff } from "./BuffConfig";


// ✅ 工厂形式：每次调用都返回全新配置对象（尤其是 actions / Action 实例）
export const EntityConfig = {
  normal_cloud: () => ({
    texture: 'cloud',
    type: EntityType.Buff, // ✅ 有益
    comment: "借风符",
    color: 0xffffff,
    actions: [
      new BoostAction(-900), // 普通力度
      new DashEnergyIncrementAction(5), // 增加冲刺能量
      new VanishAction()     // 踩了消失
    ]
  }),
  // 霹雳火
  unbroken_fire: () => ({
    texture: 'cloud',
    type: EntityType.Buff, // ✅ 有益
    color: 0xbd00ff,
    actions: [
      new BoostAction(-1500), // 大力度
      new ColdnessIncrementAction(-30), // 增加体温
      new DashEnergyIncrementAction(15), // 增加冲刺能量
      new VanishAction()
    ]
  }),
  // 唤风令
  red_cloud: () => ({
    texture: 'cloud',
    type: EntityType.Buff, // ✅ 有益
    color: 0xff0000,
    actions: [
      new DashEnergyIncrementAction(100), // 增加冲刺能量
      new VanishAction()
    ]
  }),
  // 金币
  coin: () => ({
    texture: 'cloud',
    type: EntityType.Coin,
    color: 0xffd700,
    actions: [
      new ScoreAction(200),
      new VanishAction()
    ]
  }),
  // 孔明灯
  sky_lantern: () => ({
    texture: 'sky_lantern',
    type: EntityType.Buff, // ✅ 有益
    actions: [
      new BoostAction(-800), // 力度适中
      new ColdnessIncrementAction(-15), // 增加体温
      new ApplyBuffAction(SkyLaternBuff),
      new DashEnergyIncrementAction(8), // 增加冲刺能量
      new VanishAction()
    ]
  }),
  cold_cloud: () => ({
    texture: 'cloud',
    type: EntityType.Hazard, // ✅ 危险
    color: 0x00ffff,
    actions: [
      new SlowDownAction(-800/3),     // 强制减速
      new ScoreAction(-50),           // 踩到陷阱扣分
      new VanishAction()
    ]
  }),
  iron_vulture: () => ({
    texture: 'vulture',
    type: EntityType.Hazard,
    actions: [
      // ✅ 1. 先跑转化检查
      // 如果触发了，Action 内部会把 entity disable 掉
      new WeiConversionAction(-1350),

      // ✅ 2. 再跑伤害逻辑
      // InteractableEntity 需要修改：如果 entity 不 active 了，停止后续 action
      new SlowDownAction(),
      new ScoreAction(-50),
      new VanishAction()
    ]
  }),
} satisfies Record<string, () => IEntityConfig>;