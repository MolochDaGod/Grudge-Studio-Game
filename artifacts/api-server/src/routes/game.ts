import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leaderboardTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { GetCharactersResponseItem, GetLeaderboardResponseItem, SubmitScoreBody } from "@workspace/api-zod";
import { z } from "zod/v4";

const router: IRouter = Router();

const CHARACTERS = [
  {
    id: "frost-orc-berserker",
    name: "Frost Orc Berserker",
    race: "Orc",
    role: "Berserker",
    lore: "Created when orc warriors drink the blood of frost giants. The transformation grants incredible strength but destroys higher reasoning. They roam arctic wastes, forever hungry and cold. Their body temperature is so low that their blood freezes upon exposure to air.",
    hp: 120,
    attack: 35,
    defense: 15,
    speed: 20,
    specialAbility: "Frost Rage",
    specialAbilityDescription: "Deals massive ice damage and reduces enemy speed by 50% for 2 turns.",
    weakness: "Fire",
    faction: "villain",
    rarity: "rare",
  },
  {
    id: "magma-orc-destroyer",
    name: "Magma Orc Destroyer",
    race: "Orc",
    role: "Destroyer",
    lore: "Orcs who bathe in lava pools near volcanic shrines, seeking the blessing of fire spirits. Most die instantly, but survivors become living weapons. Their touch melts steel, and they must consume coal and sulfur to survive.",
    hp: 140,
    attack: 42,
    defense: 10,
    speed: 15,
    specialAbility: "Lava Touch",
    specialAbilityDescription: "Melts enemy armor, reducing their defense by 40% for 3 turns.",
    weakness: "Water",
    faction: "villain",
    rarity: "legendary",
  },
  {
    id: "brother-maltheus",
    name: "Brother Maltheus the Corrupt",
    race: "Human",
    role: "Warlock",
    lore: "Former head librarian of the Sacred Archive who discovered pre-war texts about binding demons. His pursuit of forbidden knowledge led to possession by an ancient evil. Now spreads corruption through false teachings and cursed books.",
    hp: 90,
    attack: 38,
    defense: 12,
    speed: 25,
    specialAbility: "Eldritch Corruption",
    specialAbilityDescription: "Curses the enemy, reducing all their stats by 25% for 2 turns.",
    weakness: "Holy Light",
    faction: "villain",
    rarity: "legendary",
  },
  {
    id: "canal-lurker",
    name: "Canal Lurker",
    race: "Human (Mutated)",
    role: "Ambusher",
    lore: "Descendants of sailors who made pacts with sea demons for safe passage. Over generations, they've devolved into amphibious predators. Can mimic human voices to lure people to water's edge. Form primitive societies in flooded catacombs.",
    hp: 80,
    attack: 30,
    defense: 18,
    speed: 35,
    specialAbility: "Voice Mimic",
    specialAbilityDescription: "Confuses the enemy, causing them to skip their next turn.",
    weakness: "Bright Light",
    faction: "villain",
    rarity: "rare",
  },
  {
    id: "warlord-garnok",
    name: "Warlord Garnok the Collector",
    race: "Orc",
    role: "Warlord",
    lore: "Betrayed his clan to human slavers for personal power. Now oversees the capture and sale of his own people. Collects tusks from defeated enemies and wears them as trophies. His cruelty is legendary even among orcs.",
    hp: 160,
    attack: 45,
    defense: 20,
    speed: 18,
    specialAbility: "Trophy Collector",
    specialAbilityDescription: "Gains +10 attack permanently each time this ability is used (stacks up to 3 times).",
    weakness: "Clan Honor",
    faction: "villain",
    rarity: "legendary",
  },
  {
    id: "elven-archer",
    name: "Elven Archer",
    race: "Elf",
    role: "Ranger",
    lore: "Ancient, graceful beings who view the world through the lens of centuries. Elven societies are built around harmony with nature and the pursuit of perfection in art, magic, and warfare. They excel at magic, considering it an art form rather than mere tool.",
    hp: 85,
    attack: 40,
    defense: 14,
    speed: 40,
    specialAbility: "Precision Shot",
    specialAbilityDescription: "Guaranteed critical hit dealing 3x normal damage, ignoring all defense.",
    weakness: "Pride",
    faction: "hero",
    rarity: "uncommon",
  },
  {
    id: "orcish-warrior",
    name: "Orcish Warrior",
    race: "Orc",
    role: "Fighter",
    lore: "A warrior culture where strength determines status and honor is earned through battle. Orc society is organized into clans led by warchiefs who prove their might through combat. They value courage, loyalty to clan, and martial prowess above all else.",
    hp: 130,
    attack: 32,
    defense: 22,
    speed: 22,
    specialAbility: "Battle Cry",
    specialAbilityDescription: "Boosts own attack by 50% for the next 2 turns.",
    weakness: "None",
    faction: "neutral",
    rarity: "common",
  },
  {
    id: "human-knight",
    name: "Human Knight",
    race: "Human",
    role: "Paladin",
    lore: "A rapidly expanding race driven by ambition and adaptability. Human kingdoms are centers of trade, diplomacy, and innovation. They excel at learning from others, adopting elven magic, dwarven engineering, and even orcish battle tactics.",
    hp: 110,
    attack: 28,
    defense: 28,
    speed: 24,
    specialAbility: "Shield Bash",
    specialAbilityDescription: "Stuns the enemy for 1 turn and deals moderate damage.",
    weakness: "Hasty Decisions",
    faction: "hero",
    rarity: "common",
  },
  {
    id: "human-barbarian",
    name: "Human Barbarian",
    race: "Human",
    role: "Barbarian",
    lore: "Tribal societies that reject the soft comforts of civilization for freedom and strength. These humans live by codes of honor, personal combat prowess, and clan loyalty. Raiding is considered an honorable profession to prove warrior merit.",
    hp: 115,
    attack: 36,
    defense: 16,
    speed: 30,
    specialAbility: "Berserker Rage",
    specialAbilityDescription: "When below 30% HP, doubles attack power for the remainder of the battle.",
    weakness: "None",
    faction: "hero",
    rarity: "uncommon",
  },
  {
    id: "skeleton-undead",
    name: "Skeleton Warrior",
    race: "Undead",
    role: "Revenant",
    lore: "Not a race by birth but by transformation, the undead represent a mockery of natural order. This warrior fell on an ancient cursed battlefield and was reanimated by a lich lord. Driven by vengeance and hunger for life energy.",
    hp: 100,
    attack: 33,
    defense: 20,
    speed: 20,
    specialAbility: "Death's Embrace",
    specialAbilityDescription: "Drains life from the enemy, healing for 50% of damage dealt this turn.",
    weakness: "Holy Magic",
    faction: "villain",
    rarity: "uncommon",
  },
  {
    id: "dwarven-forge-master",
    name: "Dwarven Forge Master",
    race: "Dwarf",
    role: "Defender",
    lore: "Master craftsmen who built their civilization in the roots of mountains. Dwarven society revolves around clan lineages, craft guilds, and the accumulation of wealth and knowledge. Every dwarf belongs to a guild that determines their life's work.",
    hp: 150,
    attack: 25,
    defense: 40,
    speed: 12,
    specialAbility: "Iron Fortress",
    specialAbilityDescription: "Significantly boosts defense by 80% for 3 turns and reflects 20% of damage.",
    weakness: "Isolationism",
    faction: "hero",
    rarity: "uncommon",
  },
];

router.get("/characters", (_req, res) => {
  const characters = CHARACTERS.map((c) => GetCharactersResponseItem.parse(c));
  res.json(characters);
});

router.get("/leaderboard", async (_req, res) => {
  const entries = await db
    .select()
    .from(leaderboardTable)
    .orderBy(desc(leaderboardTable.score))
    .limit(20);

  const result = entries.map((e) =>
    GetLeaderboardResponseItem.parse({
      id: e.id,
      playerName: e.playerName,
      score: e.score,
      wins: e.wins,
      losses: e.losses,
      characterUsed: e.characterUsed,
      createdAt: e.createdAt.toISOString(),
    })
  );
  res.json(result);
});

router.post("/scores", async (req, res) => {
  const body = SubmitScoreBody.parse(req.body);
  const [entry] = await db
    .insert(leaderboardTable)
    .values({
      playerName: body.playerName,
      score: body.score,
      wins: body.wins,
      losses: body.losses,
      characterUsed: body.characterUsed,
    })
    .returning();

  const result = GetLeaderboardResponseItem.parse({
    id: entry.id,
    playerName: entry.playerName,
    score: entry.score,
    wins: entry.wins,
    losses: entry.losses,
    characterUsed: entry.characterUsed,
    createdAt: entry.createdAt.toISOString(),
  });
  res.status(201).json(result);
});

export default router;
