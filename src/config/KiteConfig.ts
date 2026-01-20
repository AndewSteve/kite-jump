export const KiteIds = {
  Default: 'default',
  Shu: 'shu',
  Wei: 'wei',
  Wu: 'wu'
} as const;
export type KiteId = typeof KiteIds[keyof typeof KiteIds];