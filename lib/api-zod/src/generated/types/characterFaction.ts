export type CharacterFaction =
  (typeof CharacterFaction)[keyof typeof CharacterFaction];

export const CharacterFaction = {
  hero: "hero",
  villain: "villain",
  neutral: "neutral",
  Crusade: "Crusade",
  Fabled: "Fabled",
  Legion: "Legion",
  Pirates: "Pirates",
} as const;
