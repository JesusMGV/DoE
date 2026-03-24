"use client";

import type { JSX } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Snowflake,
  Footprints,
  Crosshair,
  Shield,
  Skull,
  Swords,
  Sword,
  Triangle,
  Wind,
  Zap,
} from "lucide-react";

import { Card, EnemyAbilityKey, HardshipKey } from "../../Types/types";

type MetaEntry = {
  icon: JSX.Element;
  label: string;
  description: string;
};

export const hardshipMeta: Record<HardshipKey, MetaEntry> = {
  ambush: {
    icon: <Swords className="h-4 w-4" />,
    label: "Ambush",
    description: "Double the Early damage you suffer during this encounter.",
  },
  hazards: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Hazards",
    description: "Suffer 1 extra Time if you suffer Early damage and 1 extra Time if you suffer Combat damage.",
  },
  night_travel: {
    icon: <Skull className="h-4 w-4" />,
    label: "Night Travel",
    description: "Reduce your Boost by your Initiative, to a minimum of 0.",
  },
  storm: {
    icon: <Wind className="h-4 w-4" />,
    label: "Storm",
    description: "If you suffer any Time penalties this encounter, suffer an equal amount of damage.",
  },
  treacherous: {
    icon: <Triangle className="h-4 w-4" />,
    label: "Treacherous",
    description: "If you do not get Complete Victory, suffer the journey Time penalty, then 1 damage.",
  },
  steep: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    label: "Steep",
    description: "Increase the journey MP by the Boost of your Reserve card.",
  },
};

export const keywordMeta = {
  armor: {
    icon: <Shield className="h-4 w-4" />,
    label: "Armor",
    description: "Subtract this value from your attack when the enemy resists the strike.",
  },
  early: {
    icon: <Zap className="h-4 w-4" />,
    label: "Early",
    description: "If your Initiative is too low, you suffer this damage before the encounter resolves.",
  },
  time: {
    icon: <Clock3 className="h-4 w-4" />,
    label: "Time",
    description: "Cards lost from the top of the deck during the Penalty phase.",
  },
};

export const enemyAbilityMeta: Record<EnemyAbilityKey, MetaEntry> = {
  freeze: {
    icon: <Snowflake className="h-4 w-4" />,
    label: "Freeze",
    description: "If this enemy deals Early damage, discard your reserve card during Cleanup.",
  },
  ranged: {
    icon: <Crosshair className="h-4 w-4" />,
    label: "Ranged",
    description: "This enemy deals Early damage even if you beat its Initiative. You may discard your reserve to ignore that.",
  },
  slow: {
    icon: <Footprints className="h-4 w-4" />,
    label: "Slow",
    description: "You may compare Move instead of Attack against this enemy's HP.",
  },
};

export function getCardKeyState(card: Card) {
  const clampedLevel = Math.max(1, Math.min(4, card.level || 1)) as 1 | 2 | 3 | 4;
  return card.keyByLevel[clampedLevel];
}

export function getCardLevelStats(card: Card, targetLevel = card.level) {
  const clampedLevel = Math.max(1, Math.min(4, targetLevel || 1)) as 1 | 2 | 3 | 4;

  if (card.statsByLevel) {
    return card.statsByLevel[clampedLevel];
  }

  const levelTwo = {
    initiative: card.initiative,
    bonus: card.bonus,
    action: card.action,
    upgradedAction: card.upgradedAction,
    resistance: card.resistance,
  };

  const isDefensiveCard = /step|shift|breaker|granite|stone|ground|tide|flood|vault|stride/i.test(card.name);
  const isAggressiveCard = /rush|strike|crash|arc|blow|mark/i.test(card.name);
  const resistanceValueAtLevel = (level: 1 | 2 | 3 | 4) => {
    const base = levelTwo.resistance.value;

    if (isDefensiveCard) {
      if (level === 1) return Math.max(1, base - 1);
      if (level === 2) return base;
      if (level === 3) return base + 1;
      return base + 2;
    }

    if (isAggressiveCard) {
      if (level === 1) return Math.max(1, base - 1);
      if (level === 2) return base;
      if (level === 3) return base;
      return base + 1;
    }

    if (level === 1) return Math.max(1, base - 1);
    if (level === 2) return base;
    if (level === 3) return base + 1;
    return base + 1;
  };

  const resistanceAtLevel = (level: 1 | 2 | 3 | 4) => {
    const value = resistanceValueAtLevel(level);
    if (level === 1 && !isDefensiveCard && levelTwo.resistance.value <= 1) {
      return { element: null, value };
    }

    return {
      element: level === 1 && levelTwo.resistance.value <= 1 ? null : levelTwo.resistance.element,
      value,
    };
  };

  const generated = {
    1: {
      initiative: Math.max(1, levelTwo.initiative - 1),
      bonus: Math.max(0, levelTwo.bonus - 1),
      action: { ...levelTwo.action, value: Math.max(1, levelTwo.action.value - 1) },
      upgradedAction: { ...levelTwo.upgradedAction, value: Math.max(1, levelTwo.upgradedAction.value - 1) },
      resistance: resistanceAtLevel(1),
    },
    2: levelTwo,
    3: {
      initiative: levelTwo.initiative + (levelTwo.initiative < 3 ? 1 : 0),
      bonus: levelTwo.bonus + (levelTwo.bonus < 3 ? 1 : 0),
      action: { ...levelTwo.action, value: levelTwo.action.value + 1 },
      upgradedAction: { ...levelTwo.upgradedAction, value: levelTwo.upgradedAction.value + 1 },
      resistance: resistanceAtLevel(3),
    },
    4: {
      initiative: levelTwo.initiative + 1,
      bonus: levelTwo.bonus + 1,
      action: { ...levelTwo.action, value: levelTwo.action.value + 2 },
      upgradedAction: { ...levelTwo.upgradedAction, value: levelTwo.upgradedAction.value + 2 },
      resistance: resistanceAtLevel(4),
    },
  } as const;

  return generated[clampedLevel];
}

export function getCardStatChanges(card: Card, targetLevel: number) {
  if (targetLevel < 1 || targetLevel > 4 || targetLevel === card.level) {
    return [];
  }

  const current = getCardLevelStats(card, card.level);
  const next = getCardLevelStats(card, targetLevel);
  const changes = [];

  if (current.initiative !== next.initiative) {
    changes.push({
      key: "initiative",
      icon: <Zap className="h-3 w-3" />,
      from: current.initiative,
      to: next.initiative,
    });
  }

  if (current.action.value !== next.action.value || current.action.type !== next.action.type) {
    changes.push({
      key: "action",
      icon: next.action.type === "move" ? <Footprints className="h-3 w-3" /> : <Sword className="h-3 w-3" />,
      from: current.action.value,
      to: next.action.value,
    });
  }

  if (
    current.upgradedAction.value !== next.upgradedAction.value ||
    current.upgradedAction.type !== next.upgradedAction.type
  ) {
    changes.push({
      key: "upgradedAction",
      icon:
        next.upgradedAction.type === "move" ? <Footprints className="h-3 w-3" /> : <Sword className="h-3 w-3" />,
      from: current.upgradedAction.value,
      to: next.upgradedAction.value,
    });
  }

  if (current.bonus !== next.bonus) {
    changes.push({
      key: "bonus",
      icon: <ArrowUpRight className="h-3 w-3" />,
      from: current.bonus,
      to: next.bonus,
    });
  }

  if (
    current.resistance.value !== next.resistance.value ||
    current.resistance.element !== next.resistance.element
  ) {
    changes.push({
      key: "resistance",
      icon: <Shield className="h-3 w-3" />,
      from: `${current.resistance.value}`,
      to: `${next.resistance.value}`,
      tone:
        next.resistance.element === "fire"
          ? "bg-red-200 text-red-950"
          : next.resistance.element === "water"
            ? "bg-cyan-200 text-cyan-950"
            : next.resistance.element === "earth"
              ? "bg-emerald-200 text-emerald-950"
              : next.resistance.element === "wind"
                ? "bg-amber-200 text-amber-950"
                : "bg-slate-200 text-slate-950",
    });
  }

  return changes;
}
