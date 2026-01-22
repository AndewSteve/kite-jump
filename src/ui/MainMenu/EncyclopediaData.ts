import { EntityConfig } from '../../config/EntityConfig';
import { EntityIds, type EntityId } from '../../config/EntityIds';
import { EntityType } from '../../types/GameTypes';

export interface EncyclopediaEntry {
  id: EntityId;
  name: string;
  texture: string;
  type: EntityType;
}

const shouldIncludeEntity = (type: EntityType) => type !== EntityType.Neutral;

export const getEncyclopediaEntries = (): EncyclopediaEntry[] => {
  return Object.values(EntityIds)
    .map((id) => id as EntityId)
    .map((id) => {
      const config = EntityConfig[id]();
      return {
        id,
        name: config.comment ?? id,
        texture: config.texture,
        type: config.type
      };
    })
    .filter((entry) => shouldIncludeEntity(entry.type));
};
