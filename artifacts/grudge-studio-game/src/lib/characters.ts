/**
 * Static character roster — all 27 playable heroes.
 *
 * This data is embedded in the frontend so the game works standalone
 * without any backend server.  The same data exists in
 * api-server/src/routes/game.ts for the REST API.
 *
 * The Character type here matches what the rest of the game expects
 * (faction as real faction name, not the OpenAPI enum).
 */

export interface GameCharacter {
  id: string;
  name: string;
  race: string;
  role: string;
  lore: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAbility: string;
  specialAbilityDescription: string;
  weakness: string;
  faction: string;
  rarity: string;
}

export const CHARACTERS: GameCharacter[] = [
  // ===== CRUSADE — HUMAN =====
  { id: "human_warrior", name: "Sir Aldric Valorheart", race: "Human", role: "Warrior", lore: "Born in the fortified city of Valorheim, Aldric rose through the ranks of the Crusade militia to become its most decorated champion.", hp: 245, attack: 23, defense: 19, speed: 57, specialAbility: "Invincibility", specialAbilityDescription: "Become immune to all damage for a short duration.", weakness: "No ranged attacks", faction: "Crusade", rarity: "rare" },
  { id: "human_worg", name: "Gareth Moonshadow", race: "Human", role: "Worg", lore: "Once captain of the Crusade rangers, Gareth ventured too deep into the Darkwood seeking a cure for a plague.", hp: 235, attack: 22, defense: 16, speed: 67, specialAbility: "Feral Rage", specialAbilityDescription: "+30% attack speed and damage for 2 turns.", weakness: "No healing spells", faction: "Crusade", rarity: "rare" },
  { id: "human_mage", name: "Archmage Elara Brightspire", race: "Human", role: "Mage", lore: "Raised in the Brightspire Academy, Elara discovered she could channel both arcane destruction and divine healing.", hp: 175, attack: 21, defense: 9, speed: 62, specialAbility: "Lightning Chain", specialAbilityDescription: "Chain lightning hitting up to 5 targets.", weakness: "Very fragile in melee", faction: "Crusade", rarity: "epic" },
  { id: "human_ranger", name: "Kael Shadowblade", race: "Human", role: "Ranger", lore: "Kael grew up in the slums of Port Grimaldi, learning to survive through cunning and speed.", hp: 185, attack: 22, defense: 11, speed: 72, specialAbility: "Rain of Arrows", specialAbilityDescription: "Massive AoE ranged barrage hitting all enemies in target zone.", weakness: "Low armor and HP", faction: "Crusade", rarity: "rare" },
  // ===== CRUSADE — BARBARIAN =====
  { id: "barbarian_warrior", name: "Ulfgar Bonecrusher", race: "Barbarian", role: "Warrior", lore: "Ulfgar earned his title by literally shattering a mountain pass to prevent a Legion invasion.", hp: 255, attack: 26, defense: 17, speed: 58, specialAbility: "Avatar Form", specialAbilityDescription: "+40% all stats, increased size. Rage damage bonus applies.", weakness: "No ranged attacks", faction: "Crusade", rarity: "rare" },
  { id: "barbarian_worg", name: "Hrothgar Fangborn", race: "Barbarian", role: "Worg", lore: "Born during an eclipse, Hrothgar was left in the woods as an omen of doom. Raised by a great wolf mother.", hp: 245, attack: 25, defense: 14, speed: 68, specialAbility: "Worg Lord", specialAbilityDescription: "Ultimate tank form with pack summon. +50% HP, summons dire wolves.", weakness: "Form-dependent abilities", faction: "Crusade", rarity: "epic" },
  { id: "barbarian_mage", name: "Volka Stormborn", race: "Barbarian", role: "Mage", lore: "During a deadly blizzard that buried her village, young Volka discovered she could command the storm itself.", hp: 185, attack: 24, defense: 7, speed: 63, specialAbility: "Fireball", specialAbilityDescription: "AoE elemental storm damage. Rage bonus applies to spell power.", weakness: "Very fragile in melee", faction: "Crusade", rarity: "epic" },
  { id: "barbarian_ranger", name: "Svala Windrider", race: "Barbarian", role: "Ranger", lore: "Svala was the youngest hunter to ever complete the Trial of the Winter Hunt.", hp: 195, attack: 25, defense: 9, speed: 73, specialAbility: "Rain of Arrows", specialAbilityDescription: "Massive AoE ranged barrage. Rage bonus applies when below 50% HP.", weakness: "Low armor and HP", faction: "Crusade", rarity: "rare" },
  // ===== FABLED — DWARF =====
  { id: "dwarf_warrior", name: "Thane Ironshield", race: "Dwarf", role: "Warrior", lore: "Thane Ironshield is the 47th guardian of the Deep Gate, an unbroken lineage stretching back to the founding of Stonehold.", hp: 260, attack: 24, defense: 23, speed: 52, specialAbility: "Invincibility", specialAbilityDescription: "Complete damage immunity. Stoneborn +20% Defense stacks on top.", weakness: "Very slow movement", faction: "Fabled", rarity: "epic" },
  { id: "dwarf_worg", name: "Bromm Earthshaker", race: "Dwarf", role: "Worg", lore: "Bromm was a miner who broke through into a sealed cavern containing a primordial earth spirit.", hp: 250, attack: 23, defense: 20, speed: 57, specialAbility: "Bear Form", specialAbilityDescription: "+50% defense, +30% max HP. Stoneborn defense stacks — virtually unstoppable.", weakness: "Extremely slow in all forms", faction: "Fabled", rarity: "legendary" },
  { id: "dwarf_mage", name: "Runa Forgekeeper", race: "Dwarf", role: "Mage", lore: "Last of the Forgekeeper bloodline, Runa carries the knowledge of runic magic that predates the Grudge Wars.", hp: 190, attack: 22, defense: 13, speed: 52, specialAbility: "Mana Shield", specialAbilityDescription: "Passive runic barrier. Stoneborn makes her tankier than other mages.", weakness: "Slow movement", faction: "Fabled", rarity: "epic" },
  { id: "dwarf_ranger", name: "Durin Tunnelwatcher", race: "Dwarf", role: "Ranger", lore: "Durin lost his squad to a cave-in during a tunnel patrol. Alone in the dark for thirty days.", hp: 200, attack: 23, defense: 15, speed: 62, specialAbility: "Precision", specialAbilityDescription: "Passive enhanced accuracy. Armor-piercing crossbow bolts ignore partial defense.", weakness: "Less range than elf rangers", faction: "Fabled", rarity: "rare" },
  // ===== FABLED — ELF =====
  { id: "elf_warrior", name: "Thalion Bladedancer", race: "Elf", role: "Warrior", lore: "Trained in the Moonblade Academy for three centuries, Thalion mastered every weapon form.", hp: 230, attack: 22, defense: 16, speed: 65, specialAbility: "Damage Surge", specialAbilityDescription: "Blade dance combo +25% ATK. Keen Senses boost accuracy.", weakness: "Lower HP than other warriors", faction: "Fabled", rarity: "rare" },
  { id: "elf_worg", name: "Sylara Wildheart", race: "Elf", role: "Worg", lore: "When the Darkwood began to wither from Legion corruption, Sylara performed the ancient Rite of Binding.", hp: 220, attack: 21, defense: 13, speed: 70, specialAbility: "Worg Lord", specialAbilityDescription: "Ancient forest guardian form. Extra mana enables more transformations.", weakness: "Fragile base form", faction: "Fabled", rarity: "legendary" },
  { id: "elf_mage", name: "Lyra Stormweaver", race: "Elf", role: "Mage", lore: "Lyra spent four hundred years studying in the Crystal Spire before the Grudge Wars forced her into battle.", hp: 160, attack: 20, defense: 6, speed: 65, specialAbility: "Lightning Chain", specialAbilityDescription: "Storm magic chaining through 5 targets. Arcane Affinity grants +10% mana.", weakness: "Extremely fragile", faction: "Fabled", rarity: "legendary" },
  { id: "elf_ranger", name: "Aelindra Swiftbow", race: "Elf", role: "Ranger", lore: "Captain of the Silverglade Sentinels for two centuries, the greatest archer to ever live.", hp: 170, attack: 21, defense: 8, speed: 75, specialAbility: "Rain of Arrows", specialAbilityDescription: "Arcane arrow storm. Keen Senses and Arcane Affinity boost accuracy and power.", weakness: "Very fragile", faction: "Fabled", rarity: "epic" },
  // ===== LEGION — ORC =====
  { id: "orc_warrior", name: "Grommash Ironjaw", race: "Orc", role: "Warrior", lore: "Born during a blood eclipse, Grommash was destined for war. At age six he killed his first opponent in the fighting pits.", hp: 250, attack: 27, defense: 19, speed: 57, specialAbility: "Avatar Form", specialAbilityDescription: "+40% all stats, increased size. Bloodrage bonus: +20% damage below 50% HP.", weakness: "No ranged attacks", faction: "Legion", rarity: "epic" },
  { id: "orc_worg", name: "Fenris Bloodfang", race: "Orc", role: "Worg", lore: "The fiercest shapeshifter the Legion has ever produced.", hp: 240, attack: 26, defense: 16, speed: 67, specialAbility: "Feral Rage", specialAbilityDescription: "+30% attack speed and damage. Bloodrage adds +20% more when below 50% HP.", weakness: "No healing spells", faction: "Legion", rarity: "legendary" },
  { id: "orc_mage", name: "Zul'jin the Hexmaster", race: "Orc", role: "Mage", lore: "Zul'jin pried the secrets of blood sorcery from a dying shaman at spearpoint.", hp: 180, attack: 25, defense: 9, speed: 62, specialAbility: "Fireball", specialAbilityDescription: "AoE blood-fire explosion. Bloodrage applies +20% spell power when below 50% HP.", weakness: "Low physical defense", faction: "Legion", rarity: "epic" },
  { id: "orc_ranger", name: "Razak Deadeye", race: "Orc", role: "Ranger", lore: "Every head on Razak's wall was once the strongest in its land. The Legion's premier trophy hunter.", hp: 190, attack: 26, defense: 11, speed: 72, specialAbility: "Power Shot", specialAbilityDescription: "High damage ranged attack at 2x damage. Bloodrage boosts damage when low HP.", weakness: "Weak in prolonged melee", faction: "Legion", rarity: "rare" },
  // ===== LEGION — UNDEAD =====
  { id: "undead_warrior", name: "Lord Malachar", race: "Undead", role: "Warrior", lore: "Lord Malachar once ruled a kingdom that no longer exists.", hp: 265, attack: 23, defense: 20, speed: 52, specialAbility: "Guardian's Aura", specialAbilityDescription: "+15% defense to all nearby allies. Undead resilience stacks with armor.", weakness: "Slow movement", faction: "Legion", rarity: "epic" },
  { id: "undead_worg", name: "The Ghoulfather", race: "Undead", role: "Worg", lore: "No one knows what The Ghoulfather was in life. In death, he is something vast and terrible.", hp: 255, attack: 22, defense: 17, speed: 62, specialAbility: "Bear Form", specialAbilityDescription: "+50% defense, +30% max HP. Undead resilience adds +25 HP baseline.", weakness: "No healing spells", faction: "Legion", rarity: "legendary" },
  { id: "undead_mage", name: "Necromancer Vexis", race: "Undead", role: "Mage", lore: "Death is not the end for Vexis — it was the beginning.", hp: 195, attack: 21, defense: 10, speed: 57, specialAbility: "Mana Shield", specialAbilityDescription: "Soul-barrier from harvested mana. Undead trait adds +5 MP baseline.", weakness: "Low physical defense", faction: "Legion", rarity: "epic" },
  { id: "undead_ranger", name: "Shade Whisper", race: "Undead", role: "Ranger", lore: "Shade Whisper was an assassin in life who was betrayed and buried in an unmarked grave.", hp: 205, attack: 22, defense: 12, speed: 67, specialAbility: "Precision", specialAbilityDescription: "Spectral sight passive accuracy. Phantom arrows bypass partial defense.", weakness: "Weak in prolonged melee", faction: "Legion", rarity: "rare" },
  // ===== PIRATES — SECRET HEROES =====
  { id: "pirate_king", name: "Racalvin the Pirate King", race: "Barbarian", role: "Ranger", lore: "The Scourge of the Seven Seas. Racalvin commands The Grudge — the most feared warship ever built.", hp: 225, attack: 30, defense: 9, speed: 78, specialAbility: "Storm of Arrows", specialAbilityDescription: "Legendary unique ultimate — a hurricane barrage of enchanted bolts hitting all enemies on the field.", weakness: "Light armor", faction: "Pirates", rarity: "legendary" },
  { id: "sky_captain", name: "Cpt. John Wayne", race: "Human", role: "Warrior", lore: "The first captain of Racalvin's crew and the first man in history to pilot a flying machine.", hp: 240, attack: 30, defense: 18, speed: 60, specialAbility: "Skyfire Barrage", specialAbilityDescription: "Legendary unique ultimate — aerial bombing run dealing massive AoE damage from above.", weakness: "Ground-based weakness", faction: "Pirates", rarity: "legendary" },
  { id: "faith_barrier", name: "Scourge FaithBarrier", race: "Barbarian", role: "Warrior", lore: "The oldest blade in Racalvin's crew and the only living soul who has stood at the edge of the Creation Storms.", hp: 270, attack: 33, defense: 26, speed: 44, specialAbility: "Both Shores", specialAbilityDescription: "Legendary unique ultimate — FaithBarrier channels the raw force of Creation and End simultaneously.", weakness: "Arcane sorcery", faction: "Pirates", rarity: "legendary" },
];
