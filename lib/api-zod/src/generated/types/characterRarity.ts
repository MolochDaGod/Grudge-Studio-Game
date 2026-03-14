export type CharacterRarity =
  (typeof CharacterRarity)[keyof typeof CharacterRarity];

export const CharacterRarity = {
  common: "common",
  uncommon: "uncommon",
  rare: "rare",
  epic: "epic",
  legendary: "legendary",
} as const;
