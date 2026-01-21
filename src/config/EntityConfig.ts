import { ApplyBuffAction, ApplyDamageAction, BoostAction, CoinAction, ColdnessIncrementAction, 
  DashEnergyIncrementAction, HasBuffTagOrVanishAction, HealAction, RemoveLinkedSummonAction, 
  ScoreAction, SlowDownAction, SpawnLinkedSummonAction, VanishAction } from "../actions/EntityActions";
import { WeiConversionAction } from "../actions/MechanicActions";
import { EntityType, type IEntityConfig} from "../types/GameTypes";
import { AudioKeys, TextureKeys } from "./AssetKeys";
import { SkyLaternBuff, TacticsBuff, TacticsConfig } from "./BuffConfig";
import { SummonId } from "./SummonConfig";

// ✅ 1. 定义实体 ID 常量 (替代硬编码字符串)
export const EntityId = {
  // --- 基础云朵 ---
  WindRune: 'wind_rune',  // 借风符
  SkyLantern: 'sky_lantern',    // 孔明灯
  UnbrokenFire: 'unbroken_fire',// 霹雳火
  WindKey: 'wind_key',        // 唤风令
  TacticsShild: 'tactics_shild',// 八卦盾
  HealBag: 'heal_bag',        // 急救包
  Coin: 'coin',                 // 金币
  
  // --- 危险云朵 ---
  ColdFlue: 'cold_flue',      // 寒流
  ChaoticRune: 'chaotic_rune',// 乱流
  IronVulture: 'iron_vulture',  // 机关秃鹫
  // FrostVortex: 'frost_vortex', // 漩涡是召唤物，不是实体
  FrostVortexCore: 'frost_vortex_core', // 漩涡核心
} as const;

export type EntityId = typeof EntityId[keyof typeof EntityId];

export const EntityTextureScale = 0.14; // 针对 2048*2048

// ✅ 工厂形式：每次调用都返回全新配置对象（尤其是 actions / Action 实例）
export const EntityConfig = {
  // 借风符
  [EntityId.WindRune]: () => ({
    texture: TextureKeys.WindRune, 
    scale: EntityTextureScale,
    type: EntityType.Buff, // ✅ 有益
    comment: "借风符",
    // color: 0xffffff,
    onHit: [
      new BoostAction(-750), // 普通力度
      new DashEnergyIncrementAction(2), // 增加冲刺能量
      new ScoreAction(1),
      new VanishAction(150, AudioKeys.SfxJump, 0.09)     // 踩了消失
    ]
  }),
  // 孔明灯
  [EntityId.SkyLantern]: () => ({
    texture: TextureKeys.SkyLantern,
    scale: EntityTextureScale,
    type: EntityType.Buff, // ✅ 有益
    onHit: [
      new BoostAction(-750), // 力度适中
      new ColdnessIncrementAction(-15), // 增加体温
      new ApplyBuffAction(SkyLaternBuff),
      new DashEnergyIncrementAction(6), // 增加冲刺能量
      new ScoreAction(3),
      new VanishAction(150, AudioKeys.SfxCollectCoin2, EntityTextureScale * 1.2)
    ]
  }),
  // 霹雳火
  [EntityId.UnbrokenFire]: () => ({
    texture: TextureKeys.Gourd, 
    scale: EntityTextureScale,
    type: EntityType.Buff, // ✅ 有益
    // color: 0xbd00ff,
    onHit: [
      new BoostAction(-1000), // 大力度
      new ColdnessIncrementAction(-25), // 增加体温
      new DashEnergyIncrementAction(10), // 增加冲刺能量
      new ScoreAction(3),
      new VanishAction(150, AudioKeys.SfxCollectCoin3, EntityTextureScale * 1.2)
    ]
  }),
  // 唤风令
  [EntityId.WindKey]: () => ({
    texture: TextureKeys.WindKey, 
    scale: EntityTextureScale,
    type: EntityType.Buff, // ✅ 有益
    // color: 0xff0000,
    onHit: [
      new DashEnergyIncrementAction(100), // 增加冲刺能量
      new ScoreAction(3),
      new VanishAction(150, AudioKeys.SfxCollectCoin1, EntityTextureScale * 1.2)
    ]
  }),
  // 八卦盾
  [EntityId.TacticsShild]: () => ({
    texture: TextureKeys.TacticsShild, 
    scale: EntityTextureScale,
    type: EntityType.Buff, // ✅ 有益
    // color: 0x00ff00,
    onHit: [
      new BoostAction(-600), 
      new ApplyBuffAction(TacticsBuff),
      new ScoreAction(3),
      new VanishAction(150, AudioKeys.SfxCollectCoin2, EntityTextureScale * 1.2)
    ]
  }),
  // 金币
  [EntityId.Coin]: () => ({
    texture: TextureKeys.Bamboo, 
    scale: EntityTextureScale * 0.6,
    type: EntityType.Coin,
    // color: 0xffd700,
    onHit: [
      new CoinAction(200),
      new ScoreAction(1),
      new VanishAction(150, null, EntityTextureScale * 0.6)
    ]
  }),
  // 急救包
  [EntityId.HealBag]: () => ({
    texture: TextureKeys.Baozi,
    scale: EntityTextureScale,
    type: EntityType.Buff, // ✅ 有益
    // color: 0x00ffdd,
    onHit: [
      new BoostAction(-600), 
      new HealAction(1), // 恢复1点生命值
      new ScoreAction(3),
      new VanishAction(150, AudioKeys.SfxHeal, EntityTextureScale * 1.2)
    ]
  }),


  // 乱流
  [EntityId.ChaoticRune]: () => ({
    texture: TextureKeys.ChaoticRune, 
    scale: EntityTextureScale,
    type: EntityType.Hazard, // ✅ 危险
    // color: 0x00ffff,
    onHit: [
      new SlowDownAction(-900+300),     // 强制减速
      new DashEnergyIncrementAction(-1), // 减少冲刺能量
      new VanishAction(150, AudioKeys.SfxNegativeCollect, EntityTextureScale * 1.2)
    ]
  }),
  // 寒流
  [EntityId.ColdFlue]: () => ({
    texture: TextureKeys.IceCrystals, 
    scale: EntityTextureScale,
    type: EntityType.Hazard, // ✅ 危险
    // color: 0x00ffff,
    onHit: [
      new HasBuffTagOrVanishAction({
        tag: TacticsConfig.tag,
        removeBuff: true
      }),
      new SlowDownAction(-900+300),     // 强制减速
      new ColdnessIncrementAction(15), // 增加寒冷值
      new DashEnergyIncrementAction(-4), // 减少冲刺能量
      new VanishAction(150, AudioKeys.SfxNegativeCollect, EntityTextureScale * 1.2)
    ]
  }),
  // 机关秃鹫
  [EntityId.IronVulture]: () => ({
    texture: TextureKeys.Vulture,
    scale: EntityTextureScale,
    type: EntityType.Hazard,
    onHit: [
      // ✅ 1. 先跑转化检查
      // 如果触发了，Action 内部会把 entity disable 掉
      new WeiConversionAction(-1350),

      // ✅ 2. 再跑伤害逻辑
      // InteractableEntity 需要修改：如果 entity 不 active 了，停止后续 action
      new HasBuffTagOrVanishAction({
        tag: TacticsConfig.tag,
        removeBuff: true
      }),
      new SlowDownAction(-900+300), // 撞击后大幅减速
      new ApplyDamageAction(1), // 造成伤害
      new VanishAction(150, AudioKeys.SfxHit, EntityTextureScale * 1.2)
    ]
  }),
  // 霜之漩涡
  [EntityId.FrostVortexCore]: () => ({
    texture: TextureKeys.FrostVortex, // 核心贴图 (内圈死亡判定)
    scale: EntityTextureScale * 0.01, // 核心很小
    type: EntityType.Hazard,
    
    // ✅ 1. 刚生出来时：召唤视觉与吸力场
    onSpawn: [
      new SpawnLinkedSummonAction(SummonId.FrostVortex)
    ],
    
    // ✅ 2. 被回收时 (离开屏幕)：让召唤物也消失
    onRecycle: [
      new RemoveLinkedSummonAction()
    ],
    
    // ✅ 3. 撞到核心时：扣血/死亡 (核心逻辑)
    onHit: [
       new ApplyDamageAction(3), // 假设有扣血 Action
       new VanishAction(150, AudioKeys.SfxHit, EntityTextureScale * 0.01)
    ]
  })
} satisfies Record<EntityId, () => IEntityConfig>;
