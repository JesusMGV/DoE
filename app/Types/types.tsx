export type Elemental = "fire" | "water" | "earth" | "wind";

export type ActionType = "move" | "attack";
export type EncounterKind = "enemy" | "adventure" | "dragon";
export type OutcomeLabel = "complete" | "narrow" | "loss";
export type HardshipKey = "ambush" | "hazards" | "night_travel" | "storm" | "treacherous" | "steep";
export type EnemyAbilityKey = "freeze" | "ranged" | "slow";

export interface Action {
  type: ActionType;
  value: number;
}

export interface Resistance {
  element: Elemental | null;
  value: number;
}

export interface CardEncounter {
  kind: "enemy" | "adventure";
  value: 1 | 2 | 3 | 4;
}

export interface CardKeyState {
  encounter: CardEncounter;
  hardship: HardshipKey | null;
}

export interface CardLevelStats {
  initiative: number;
  bonus: number;
  action: Action;
  upgradedAction: Action;
  resistance: Resistance;
}

export interface Card {
  id: string;
  name: string;
  element: Elemental;
  level: number;
  experience: number;
  nextLevelExperience: number;
  initiative: number;
  bonus: number;
  action: Action;
  upgradedAction: Action;
  upgradeRequirement: Elemental;
  resistance: Resistance;
  keyByLevel: Record<1 | 2 | 3 | 4, CardKeyState>;
  statsByLevel?: Record<1 | 2 | 3 | 4, CardLevelStats>;
}

export interface Enemy {
  id: string;
  name: string;
  element: Elemental;
  attackElement?: Elemental | null;
  resistanceElement?: Elemental | null;
  health: number;
  armor: number;
  initiative: number;
  attack: number;
  earlyDamage: number;
  xpReward: number;
  ability?: EnemyAbilityKey | null;
  description: string;
}

export interface Adventure {
  id: string;
  name: string;
  targetProgress: number;
  timePenalty: number;
  rewardXp: number;
  peril: HardshipKey;
  objective: string;
}

export interface Region {
  id: string;
  name: string;
  level: number;
  enemyIds: [string, string, string, string];
  adventureIds: [string, string, string, string];
}

export interface Dragon {
  id: string;
  name: string;
  element: Elemental;
  journeyTiers: [number, number, number];
  journeyPenalties: [number, number, number];
  healthTiers: [number, number, number];
  attackTiers: [number, number, number];
  armor: number;
  initiative: number;
  earlyDamage: number;
  xpReward: number;
  description: string;
}

export interface BattlePreview {
  encounterKind: EncounterKind;
  outcome: OutcomeLabel;
  actionType: ActionType;
  totalActionValue: number;
  actionBaseValue?: number;
  actionBonusApplied?: number;
  actionReductionTotal?: number;
  actionReductionReasons?: string[];
  totalInitiative: number;
  damagePenalty: number;
  timePenalty: number;
  hardship: HardshipKey | null;
  enemyAbility?: EnemyAbilityKey | null;
  earlyDamage?: number;
  combatDamage?: number;
  discardReserveOnCleanup?: boolean;
  summary: string;
}

export type Zones = {
  hand: string[];
  deck: string[];
  discard: string[];
  action: string | null;
  element: string | null;
  modifier: string | null;
  bonusAction: string | null;
  bonusInit: string | null;
};

export type ZoneId = keyof Zones;
