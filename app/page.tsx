"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { ChevronDown, FlaskConical } from "lucide-react";

import Board from "./Components/Board";
import Hand from "./Components/Hand";
import { getCardKeyState, getCardLevelStats } from "./Components/game/rulebookMeta";
import { ZoneRules } from "./Components/game/zoneRules";
import {
  ActionType,
  Adventure,
  BattlePreview,
  Card,
  Dragon,
  Elemental,
  EncounterKind,
  Enemy,
  HardshipKey,
  OutcomeLabel,
  Region,
  ZoneId,
  Zones,
} from "./Types/types";
import { adventures, cards as cardCatalog, dragon, enemies, regions } from "./data/gameContent";

const STARTING_HAND_SIZE = 4;

type CampaignPhase = "region" | "dragon" | "complete";
type BoostTarget = "action" | "initiative";
type DragonStage = "journey" | "fight";

type CampaignState = {
  xp: number;
  regionIndex: number;
  phase: CampaignPhase;
  dragonStage: DragonStage | null;
  result: "victory" | "defeat" | null;
  resolvedEncounters: number;
  divertsUsed: number;
};

type TestControls = {
  attackModifier: number;
  moveModifier: number;
  initiativeModifier: number;
  forceAdvancedAction: boolean;
};

type EncounterResolution = {
  encounterKind: EncounterKind;
  outcome: OutcomeLabel;
  earnedXp: number;
  xpToSpend: number;
  remainingDamage: number;
  remainingTimePenalty: number;
  availableCardIds: string[];
  downgradedCardIds: string[];
  reserveCardId: string | null;
  discardReserveOnCleanup: boolean;
  history: Array<{
    cardId: string;
    cardBefore: Card;
    resolutionBefore: {
      xpToSpend: number;
      remainingDamage: number;
      remainingTimePenalty: number;
      downgradedCardIds: string[];
    };
    kind: "upgrade" | "downgrade";
  }>;
};

type FinalActionSet = {
  label: "Action Set #1" | "Action Set #2";
  cardIds: string[];
  preview: BattlePreview;
  boostTarget: BoostTarget;
};

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildDeckState(cards: Record<string, Card>, randomized = true) {
  const cardIds = Object.keys(cards);
  const orderedIds = randomized ? shuffle(cardIds) : cardIds;

  return {
    hand: orderedIds.slice(0, STARTING_HAND_SIZE),
    deck: orderedIds.slice(STARTING_HAND_SIZE),
    discard: [] as string[],
  };
}

function buildInitialSetup(randomized = true) {
  const cards: Record<string, Card> = {};

  cardCatalog.forEach((card) => {
    cards[card.id] = {
      ...card,
      level: 2,
      experience: 0,
      nextLevelExperience: 4,
    };
  });

  const deckState = buildDeckState(cards, randomized);

  return {
    cards,
    zones: {
      hand: deckState.hand,
      deck: deckState.deck,
      discard: deckState.discard,
      action: null,
      element: null,
      modifier: null,
      bonusAction: null,
      bonusInit: null,
    } satisfies Zones,
  };
}

function clearActionSet(state: Zones) {
  return {
    ...state,
    action: null,
    element: null,
    modifier: null,
    bonusAction: null,
    bonusInit: null,
  };
}

function buildEmptyZones(): Zones {
  return {
    hand: [],
    deck: [],
    discard: [],
    action: null,
    element: null,
    modifier: null,
    bonusAction: null,
    bonusInit: null,
  };
}

function removeCardFromZones(state: Zones, cardId: string) {
  const next: Zones = {
    ...state,
    hand: state.hand.filter((id) => id !== cardId),
    deck: state.deck.filter((id) => id !== cardId),
    discard: state.discard.filter((id) => id !== cardId),
  };

  const singleZones: ZoneId[] = ["action", "element", "modifier", "bonusAction", "bonusInit"];

  singleZones.forEach((zone) => {
    if (next[zone] === cardId) {
      next[zone] = null;
    }
  });

  return next;
}

function refillHand(state: Zones, options?: { allowDiscardReshuffle?: boolean }) {
  const next: Zones = {
    ...state,
    hand: [...state.hand],
    deck: [...state.deck],
    discard: [...state.discard],
  };
  const allowDiscardReshuffle = options?.allowDiscardReshuffle ?? true;

  while (next.hand.length < STARTING_HAND_SIZE) {
    if (allowDiscardReshuffle && next.deck.length === 0 && next.discard.length > 0) {
      next.deck = shuffle(next.discard);
      next.discard = [];
    }

    const nextCard = next.deck.shift();

    if (!nextCard) {
      break;
    }

    next.hand.push(nextCard);
  }

  return next;
}

function resolveEncounterFromKeyCard(region: Region, keyCard: Card) {
  const keyState = getCardKeyState(keyCard);

  if (keyState.encounter.kind === "enemy") {
    return enemies[region.enemyIds[keyState.encounter.value - 1]];
  }

  return adventures[region.adventureIds[keyState.encounter.value - 1]];
}

function describeHardshipEffect(hardship: HardshipKey | null) {
  switch (hardship) {
    case "ambush":
      return "Ambush doubles the Early damage you suffer.";
    case "hazards":
      return "Hazards add 1 extra Time for Early damage and 1 extra Time for Combat damage.";
    case "night_travel":
      return "Night Travel reduces your Boost by your Initiative, to a minimum of 0.";
    case "storm":
      return "Storm turns any Time you lose this encounter into equal damage.";
    case "treacherous":
      return "Treacherous journeys deal 1 damage after Time penalties if you miss Complete Victory.";
    case "steep":
      return "Steep increases the journey MP by your Reserve card's Boost.";
    default:
      return null;
  }
}

function getElementalResistancePenalty(actionType: ActionType, attackElement: Elemental, defenderElement: Elemental) {
  return actionType === "attack" && attackElement === defenderElement ? 1 : 0;
}

function getPreview({
  zones,
  cards,
  encounterKind,
  enemy,
  adventure,
  dragonEncounter,
  boostTarget,
  hardship,
  reserveBoost,
  ignoreRangedEarlyDamage,
  testControls,
}: {
  zones: Zones;
  cards: Record<string, Card>;
  encounterKind: EncounterKind;
  enemy: Enemy | null;
  adventure: Adventure | null;
  dragonEncounter: Dragon | null;
  boostTarget: BoostTarget;
  hardship: HardshipKey | null;
  reserveBoost: number;
  ignoreRangedEarlyDamage: boolean;
  testControls: TestControls;
}): BattlePreview | null {
  if (!zones.action || !zones.element) {
    return null;
  }

  const actionCard = cards[zones.action];
  const elementCard = cards[zones.element];
  const boostCard = zones.bonusAction ? cards[zones.bonusAction] : null;
  const mergeCard = zones.modifier ? cards[zones.modifier] : null;
  const actionStats = getCardLevelStats(actionCard);
  const elementStats = getCardLevelStats(elementCard);
  const boostStats = boostCard ? getCardLevelStats(boostCard) : null;

  const isUpgraded =
    testControls.forceAdvancedAction ||
    elementCard.element === actionCard.upgradeRequirement ||
    Boolean(mergeCard);
  const resolvedAction = isUpgraded ? actionStats.upgradedAction : actionStats.action;
  const printedBoost = boostStats?.bonus ?? 0;
  const effectiveBoost =
    hardship === "night_travel" ? Math.max(0, printedBoost - elementStats.initiative) : printedBoost;
  const totalInitiative =
    elementStats.initiative +
    (encounterKind === "adventure" ? 0 : boostTarget === "initiative" ? effectiveBoost : 0) +
    testControls.initiativeModifier;
  const baseActionValue =
    resolvedAction.value + (encounterKind === "adventure" || boostTarget === "action" ? effectiveBoost : 0);
  const totalActionValue =
    baseActionValue +
    (resolvedAction.type === "attack" ? testControls.attackModifier : testControls.moveModifier);
  const hardshipText = describeHardshipEffect(hardship);

  if (encounterKind === "enemy" && enemy) {
    const elementalPenalty = enemy.resistanceElement
      ? getElementalResistancePenalty(resolvedAction.type, elementCard.element, enemy.resistanceElement)
      : 0;
    const comparisonValue =
      enemy.ability === "slow" && resolvedAction.type === "move"
        ? totalActionValue
        : resolvedAction.type === "attack"
          ? totalActionValue
          : 1;
    const effectiveAttack = Math.max(
      0,
      comparisonValue - enemy.armor - elementalPenalty
    );
    const halfHp = Math.ceil(enemy.health / 2);
    const outcome: OutcomeLabel =
      effectiveAttack >= enemy.health
        ? "complete"
        : effectiveAttack >= halfHp
          ? "narrow"
          : "loss";
    const earlyDamage =
      enemy.ability === "ranged"
        ? ignoreRangedEarlyDamage
          ? 0
          : enemy.earlyDamage
        : totalInitiative < enemy.initiative
          ? enemy.earlyDamage
          : 0;
    const combatDamage = outcome === "complete" ? 0 : enemy.attack;
    const damagePenalty = (hardship === "ambush" ? earlyDamage * 2 : earlyDamage) + combatDamage;
    const timePenalty =
      (hardship === "hazards" && earlyDamage > 0 ? 1 : 0) +
      (hardship === "hazards" && combatDamage > 0 ? 1 : 0);

    return {
      encounterKind,
      outcome,
      actionType: resolvedAction.type,
      totalActionValue: effectiveAttack,
      totalInitiative,
      damagePenalty,
      timePenalty,
      hardship,
      enemyAbility: enemy.ability ?? null,
      earlyDamage,
      combatDamage,
      discardReserveOnCleanup:
        Boolean(enemy.ability === "freeze" && earlyDamage > 0) ||
        Boolean(enemy.ability === "ranged" && ignoreRangedEarlyDamage),
      summary:
        outcome === "complete"
          ? `Defeat ${enemy.name} and gain ${enemy.xpReward} XP.${timePenalty ? ` You still lose ${timePenalty} time.` : ""}${elementalPenalty ? ` Elemental resistance reduced your attack by ${elementalPenalty}.` : ""}`
          : outcome === "narrow"
            ? `Narrow victory against ${enemy.name}; you still take ${damagePenalty} damage${timePenalty ? ` and lose ${timePenalty} time` : ""}.${elementalPenalty ? ` Elemental resistance reduced your attack by ${elementalPenalty}.` : ""}`
            : `${enemy.name} overwhelms the action set for ${damagePenalty} damage${timePenalty ? ` and ${timePenalty} time` : ""}.${hardshipText ? ` ${hardshipText}` : ""}${elementalPenalty ? ` Elemental resistance reduced your attack by ${elementalPenalty}.` : ""}`,
    };
  }

  if (encounterKind === "adventure" && adventure) {
    const progressTarget = adventure.targetProgress + (hardship === "steep" ? reserveBoost : 0);
    const effectiveMove = resolvedAction.type === "move" ? totalActionValue : 1;
    const halfMp = Math.ceil(progressTarget / 2);
    const outcome: OutcomeLabel =
      effectiveMove >= progressTarget
        ? "complete"
        : effectiveMove >= halfMp
          ? "narrow"
          : "loss";
    const baseTimePenalty = outcome === "complete" ? 0 : adventure.timePenalty;
    const treacherousDamage =
      outcome === "complete" || adventure.peril !== "treacherous" ? 0 : 1;
    const hazardsTime =
      hardship === "hazards" && treacherousDamage > 0 ? 1 : 0;
    const stormDamage = hardship === "storm" ? baseTimePenalty + hazardsTime : 0;
    const timePenalty = baseTimePenalty + hazardsTime;
    const damagePenalty = treacherousDamage + stormDamage;

    return {
      encounterKind,
      outcome,
      actionType: resolvedAction.type,
      totalActionValue: effectiveMove,
      totalInitiative,
      damagePenalty,
      timePenalty,
      hardship,
      enemyAbility: null,
      earlyDamage: 0,
      combatDamage: 0,
      discardReserveOnCleanup: false,
      summary:
        outcome === "complete"
          ? `Clear ${adventure.name} and gain ${adventure.rewardXp} XP.`
          : outcome === "narrow"
            ? `Advance through ${adventure.name}, but lose ${timePenalty} time.${damagePenalty ? ` You also take ${damagePenalty} damage.` : ""}${hardshipText ? ` ${hardshipText}` : ""}`
            : `Fail the journey and lose ${timePenalty} time.${damagePenalty ? ` You also take ${damagePenalty} damage.` : ""}${hardshipText ? ` ${hardshipText}` : ""}`,
    };
  }

  if (encounterKind === "adventure" && dragonEncounter) {
    const effectiveMove = resolvedAction.type === "move" ? totalActionValue : 1;

    return {
      encounterKind,
      outcome: "complete",
      actionType: resolvedAction.type,
      totalActionValue: effectiveMove,
      totalInitiative,
      damagePenalty: 0,
      timePenalty: 0,
      hardship: null,
      enemyAbility: null,
      earlyDamage: 0,
      combatDamage: 0,
      discardReserveOnCleanup: false,
      summary: `Save this action set for the Final Journey. Total Move so far: ${effectiveMove}.`,
    };
  }

  if (encounterKind === "dragon" && dragonEncounter) {
    const earlyDamage = totalInitiative < dragonEncounter.initiative ? dragonEncounter.earlyDamage : 0;
    const elementalPenalty = getElementalResistancePenalty(resolvedAction.type, elementCard.element, dragonEncounter.element);
    const effectiveAttack = Math.max(
      0,
      (resolvedAction.type === "attack" ? totalActionValue : 1) - dragonEncounter.armor - elementalPenalty
    );
    const topTier = dragonEncounter.healthTiers[2];
    const middleTier = dragonEncounter.healthTiers[1];
    const outcome: OutcomeLabel =
      effectiveAttack >= topTier
        ? "complete"
        : effectiveAttack >= middleTier
          ? "narrow"
          : "loss";
    const damagePenalty =
      earlyDamage +
      (outcome === "complete" ? 0 : dragonEncounter.attackTiers[2]);

    return {
      encounterKind,
      outcome,
      actionType: resolvedAction.type,
      totalActionValue: effectiveAttack,
      totalInitiative,
      damagePenalty,
      timePenalty: 0,
      hardship,
      enemyAbility: null,
      earlyDamage,
      combatDamage: outcome === "complete" ? 0 : dragonEncounter.attack,
      discardReserveOnCleanup: false,
      summary: `Save this action set for the Final Enemy. Attack ${effectiveAttack}, Initiative ${totalInitiative}.${elementalPenalty ? ` Same-element resistance reduced this set by ${elementalPenalty}.` : ""}`,
    };
  }

  return null;
}

export default function Home() {
  const isClientReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [initialSetup] = useState(() => buildInitialSetup(false));
  const [cards, setCards] = useState<Record<string, Card>>(initialSetup.cards);
  const [zones, setZones] = useState<Zones>(initialSetup.zones);
  const [campaign, setCampaign] = useState<CampaignState>({
    xp: 0,
    regionIndex: 0,
    phase: "region",
    dragonStage: null,
    result: null,
    resolvedEncounters: 0,
    divertsUsed: 0,
  });
  const [boostTarget, setBoostTarget] = useState<BoostTarget>("action");
  const [testControlsOpen, setTestControlsOpen] = useState(true);
  const [testControls, setTestControls] = useState<TestControls>({
    attackModifier: 0,
    moveModifier: 0,
    initiativeModifier: 0,
    forceAdvancedAction: false,
  });
  const [reserveCounterKey, setReserveCounterKey] = useState<string | null>(null);
  const [resolution, setResolution] = useState<EncounterResolution | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finalActionSets, setFinalActionSets] = useState<FinalActionSet[]>([]);
  const [dragonJourneyRegroupUsed, setDragonJourneyRegroupUsed] = useState(false);
  const [regroupMode, setRegroupMode] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const randomizedSetup = buildInitialSetup(true);
      setCards(randomizedSetup.cards);
      setZones(randomizedSetup.zones);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const currentRegion = regions[Math.min(campaign.regionIndex, regions.length - 1)];
  const keyCard = zones.deck[0] ? cards[zones.deck[0]] : null;
  const currentKeyState = keyCard ? getCardKeyState(keyCard) : null;
  const activeEncounter =
    campaign.phase === "region" && keyCard
      ? resolveEncounterFromKeyCard(currentRegion, keyCard)
      : null;

  const encounterKind: EncounterKind =
    campaign.phase === "dragon"
      ? campaign.dragonStage === "journey"
        ? "adventure"
        : "dragon"
      : currentKeyState?.encounter.kind ?? "enemy";

  const currentEnemy = encounterKind === "enemy" ? (activeEncounter as Enemy) : null;
  const currentAdventure = encounterKind === "adventure" ? (activeEncounter as Adventure) : null;
  const nextKeyCard = campaign.phase === "region" && zones.deck[1] ? cards[zones.deck[1]] : null;
  const nextEncounter =
    campaign.phase === "region" && nextKeyCard
      ? resolveEncounterFromKeyCard(currentRegion, nextKeyCard)
      : null;
  const nextEnemy = nextEncounter && "health" in nextEncounter ? (nextEncounter as Enemy) : null;
  const nextAdventure = nextEncounter && "targetProgress" in nextEncounter ? (nextEncounter as Adventure) : null;
  const reservePreviewCard =
    zones.hand.length === 1 && !zones.modifier && zones.action && zones.element && zones.bonusAction
      ? cards[zones.hand[0]]
      : null;
  const canUseReserveAgainstRanged = Boolean(
    currentEnemy?.ability === "ranged" && reservePreviewCard && !resolution
  );
  const currentReserveCounterKey = canUseReserveAgainstRanged
    ? `${currentEnemy?.id}:${reservePreviewCard?.id}`
    : null;
  const useReserveAgainstRanged =
    currentReserveCounterKey !== null && reserveCounterKey === currentReserveCounterKey;

  const preview = getPreview({
    zones,
    cards,
    encounterKind,
    enemy: currentEnemy,
    adventure: currentAdventure,
    dragonEncounter: campaign.phase === "dragon" ? dragon : null,
    boostTarget,
    hardship: currentKeyState?.hardship ?? null,
    reserveBoost: reservePreviewCard?.bonus ?? 0,
    ignoreRangedEarlyDamage: canUseReserveAgainstRanged && useReserveAgainstRanged,
    testControls,
  });

  function handleDragEnd(event: DragEndEvent) {
    if (resolution) {
      return;
    }

    const { active, over } = event;

    if (!over) {
      return;
    }

    const cardId = active.id as string;
    const zone = over.id as ZoneId;

    if (zone === "bonusInit") {
      return;
    }

    setZones((prev) => {
      const next = removeCardFromZones(prev, cardId);
      const rule = ZoneRules[zone];

      if (rule.type === "multi") {
        next[zone].push(cardId);
        return next;
      }

      const existing = next[zone];

      if (existing) {
        next.hand.push(existing);
      }

      next[zone] = cardId;
      return next;
    });
  }

  function returnToHandAction(card: Card) {
    setZones((prev) => {
      const next = removeCardFromZones(prev, card.id);
      next.hand.push(card.id);
      return next;
    });
  }

  function setupNextExpedition(nextCards: Record<string, Card>) {
    const deckState = buildDeckState(nextCards);

    return {
      hand: deckState.hand,
      deck: deckState.deck,
      discard: [] as string[],
      action: null,
      element: null,
      modifier: null,
      bonusAction: null,
      bonusInit: null,
    } satisfies Zones;
  }

  function setupDragonJourney(nextCards: Record<string, Card>) {
    const shuffledIds = shuffle(Object.keys(nextCards));

    return {
      ...buildEmptyZones(),
      hand: shuffledIds.slice(0, 7),
      deck: shuffledIds.slice(7),
    } satisfies Zones;
  }

  function setupDragonFightFromJourney(state: Zones) {
    const deck = [...state.deck];
    return {
      ...buildEmptyZones(),
      hand: deck,
      deck: [],
      discard: [...state.discard],
    } satisfies Zones;
  }

  function getCurrentActionSetCardIds(state: Zones) {
    return [state.action, state.element, state.bonusAction, state.modifier].filter(
      (cardId): cardId is string => Boolean(cardId)
    );
  }

  function saveDragonActionSet() {
    if (!preview || campaign.phase !== "dragon" || finalActionSets.length >= 2) {
      return;
    }

    const cardIds = getCurrentActionSetCardIds(zones);
    if (cardIds.length === 0) {
      return;
    }

    setFinalActionSets((prev) => [
      ...prev,
      {
        label: prev.length === 0 ? "Action Set #1" : "Action Set #2",
        cardIds,
        preview,
        boostTarget,
      },
    ]);

    setZones((prev) => ({
      ...clearActionSet(prev),
      hand: prev.hand.filter((id) => !cardIds.includes(id)),
    }));
  }

  function editDragonActionSet(index: number) {
    const actionSet = finalActionSets[index];
    if (!actionSet || resolution) {
      return;
    }

    setFinalActionSets((prev) => prev.filter((_, setIndex) => setIndex !== index));
    setZones((prev) => ({
      ...prev,
      hand: [...prev.hand, ...actionSet.cardIds],
      action: null,
      element: null,
      bonusAction: null,
      modifier: null,
    }));
  }

  const combinedDragonJourneyResult =
    campaign.phase === "dragon" && campaign.dragonStage === "journey" && finalActionSets.length === 2
      ? (() => {
          const totalMove = finalActionSets.reduce((sum, set) => sum + set.preview.totalActionValue, 0);
          const [tier1, tier2, tier3] = dragon.journeyTiers;
          const [pen1, pen2, pen3] = dragon.journeyPenalties;

          if (totalMove < tier1) {
            return {
              totalMove,
              outcome: "loss" as const,
              timePenalty: 999,
              summary: "The Final Journey fails below the first tier. The run is lost immediately.",
            };
          }

          if (totalMove < tier2) {
            return {
              totalMove,
              outcome: "narrow" as const,
              timePenalty: pen3,
              summary: `You clear the first Final Journey tier and suffer ${pen3} time.`,
            };
          }

          if (totalMove < tier3) {
            return {
              totalMove,
              outcome: "narrow" as const,
              timePenalty: pen2,
              summary: `You clear the second Final Journey tier and suffer ${pen2} time.`,
            };
          }

          return {
            totalMove,
            outcome: "complete" as const,
            timePenalty: pen1,
            summary: `You clear the third Final Journey tier and suffer only ${pen1} time.`,
          };
        })()
      : null;

  const combinedDragonFightResult =
    campaign.phase === "dragon" && campaign.dragonStage === "fight" && finalActionSets.length === 2
      ? (() => {
          const totalAttack = finalActionSets.reduce((sum, set) => sum + set.preview.totalActionValue, 0);
          const totalInitiative = finalActionSets.reduce((sum, set) => sum + set.preview.totalInitiative, 0);
          const earlyDamage = totalInitiative < dragon.initiative ? dragon.earlyDamage : 0;
          const [hp1, hp2, hp3] = dragon.healthTiers;
          const [atk1, atk2, atk3] = dragon.attackTiers;

          if (totalAttack < hp1) {
            return {
              totalAttack,
              totalInitiative,
              outcome: "loss" as const,
              combatDamage: 999,
              totalDamage: 999,
              summary: "The Final Enemy attack misses the first tier. The run is lost immediately.",
            };
          }

          if (totalAttack < hp2) {
            return {
              totalAttack,
              totalInitiative,
              outcome: "narrow" as const,
              combatDamage: atk1,
              totalDamage: earlyDamage + atk1,
              summary: `You hit the first dragon tier and must soak ${earlyDamage + atk1} total damage.`,
            };
          }

          if (totalAttack < hp3) {
            return {
              totalAttack,
              totalInitiative,
              outcome: "narrow" as const,
              combatDamage: atk2,
              totalDamage: earlyDamage + atk2,
              summary: `You hit the second dragon tier and must soak ${earlyDamage + atk2} total damage.`,
            };
          }

          return {
            totalAttack,
            totalInitiative,
            outcome: "complete" as const,
            combatDamage: atk3,
            totalDamage: earlyDamage + atk3,
            summary: `You hit the top dragon tier and still must soak ${earlyDamage + atk3} total damage to win.`,
          };
        })()
      : null;

  const displayPreview: BattlePreview | null =
    campaign.phase === "dragon" && campaign.dragonStage === "journey" && combinedDragonJourneyResult
      ? {
          encounterKind: "adventure",
          outcome: combinedDragonJourneyResult.outcome,
          actionType: "move",
          totalActionValue: combinedDragonJourneyResult.totalMove,
          totalInitiative: finalActionSets.reduce((sum, set) => sum + set.preview.totalInitiative, 0),
          damagePenalty: 0,
          timePenalty: combinedDragonJourneyResult.timePenalty >= 999 ? 0 : combinedDragonJourneyResult.timePenalty,
          hardship: null,
          enemyAbility: null,
          earlyDamage: 0,
          combatDamage: 0,
          discardReserveOnCleanup: false,
          summary: combinedDragonJourneyResult.summary,
        }
      : campaign.phase === "dragon" && campaign.dragonStage === "fight" && combinedDragonFightResult
        ? {
            encounterKind: "dragon",
            outcome: combinedDragonFightResult.outcome,
            actionType: "attack",
            totalActionValue: combinedDragonFightResult.totalAttack,
            totalInitiative: combinedDragonFightResult.totalInitiative,
            damagePenalty: combinedDragonFightResult.totalDamage >= 999 ? 0 : combinedDragonFightResult.totalDamage,
            timePenalty: 0,
            hardship: null,
            enemyAbility: null,
            earlyDamage: 0,
            combatDamage: combinedDragonFightResult.combatDamage >= 999 ? 0 : combinedDragonFightResult.combatDamage,
            discardReserveOnCleanup: false,
            summary: combinedDragonFightResult.summary,
          }
        : preview;

  function resolveEncounter() {
    if (resolution) {
      return;
    }

    if (campaign.phase === "dragon" && finalActionSets.length < 2) {
      saveDragonActionSet();
      return;
    }

    if (!preview && !combinedDragonJourneyResult && !combinedDragonFightResult) {
      return;
    }

    if (campaign.phase === "dragon" && campaign.dragonStage === "journey" && combinedDragonJourneyResult) {
      if (combinedDragonJourneyResult.timePenalty >= 999) {
        setCampaign((prev) => ({ ...prev, phase: "complete", result: "defeat" }));
        setNotice("The Final Journey failed below the first tier. The campaign is lost.");
        return;
      }

      const availableCardIds = [...new Set([...finalActionSets.flatMap((set) => set.cardIds), ...zones.hand])];
      setResolution({
        encounterKind: "adventure",
        outcome: combinedDragonJourneyResult.outcome,
        earnedXp: 0,
        xpToSpend: 0,
        remainingDamage: 0,
        remainingTimePenalty: combinedDragonJourneyResult.timePenalty,
        availableCardIds,
        downgradedCardIds: [],
        reserveCardId: null,
        discardReserveOnCleanup: false,
        history: [],
      });
      return;
    }

    if (campaign.phase === "dragon" && campaign.dragonStage === "fight" && combinedDragonFightResult) {
      if (combinedDragonFightResult.totalDamage >= 999) {
        setCampaign((prev) => ({ ...prev, phase: "complete", result: "defeat" }));
        setNotice("The dragon fight failed below the first tier. The campaign is lost.");
        return;
      }

      const availableCardIds = [...new Set([...finalActionSets.flatMap((set) => set.cardIds), ...zones.hand])];
      setResolution({
        encounterKind: "dragon",
        outcome: combinedDragonFightResult.outcome,
        earnedXp: 0,
        xpToSpend: 0,
        remainingDamage: combinedDragonFightResult.totalDamage,
        remainingTimePenalty: 0,
        availableCardIds,
        downgradedCardIds: [],
        reserveCardId: null,
        discardReserveOnCleanup: false,
        history: [],
      });
      return;
    }

    const xpToSpend =
      preview.outcome === "loss"
        ? 0
        : preview.encounterKind === "enemy"
          ? currentEnemy?.xpReward ?? 0
          : preview.encounterKind === "adventure"
            ? currentAdventure?.rewardXp ?? 0
            : dragon.xpReward;

    const remainingDamage =
      preview.damagePenalty;
    const remainingTimePenalty = preview.timePenalty;

    const availableCardIds = [
      zones.action,
      zones.element,
      zones.bonusAction,
      zones.modifier,
      ...zones.hand,
    ].filter((cardId, index, arr): cardId is string => Boolean(cardId) && arr.indexOf(cardId) === index);

    setResolution({
      encounterKind: preview.encounterKind,
      outcome: preview.outcome,
      earnedXp: xpToSpend,
      xpToSpend,
      remainingDamage,
      remainingTimePenalty,
      availableCardIds,
      downgradedCardIds: [],
      reserveCardId: reservePreviewCard?.id ?? null,
      discardReserveOnCleanup: Boolean(preview.discardReserveOnCleanup),
      history: [],
    });
  }

  function applyDowngrade(cardId: string) {
    if (!resolution || resolution.remainingDamage <= 0) {
      return;
    }

    if (resolution.downgradedCardIds.includes(cardId)) {
      return;
    }

    const card = cards[cardId];
    if (!card) {
      return;
    }
    const cardStats = getCardLevelStats(card);

    const attackElement =
      resolution.encounterKind === "enemy"
        ? currentEnemy?.attackElement ?? null
        : resolution.encounterKind === "dragon"
          ? dragon.element
          : null;
    const soak =
      cardStats.resistance.value *
      (attackElement && cardStats.resistance.element === attackElement ? 2 : 1);

    const downgradedCard =
      card.level <= 1
        ? { ...card, level: 0 }
        : { ...card, level: card.level - 1 };

    setCards((prev) => ({
      ...prev,
      [cardId]: downgradedCard,
    }));

    setResolution((prev) =>
      prev
        ? {
            ...prev,
            remainingDamage: Math.max(0, prev.remainingDamage - soak),
            downgradedCardIds: [...prev.downgradedCardIds, cardId],
            history: [
              ...prev.history,
              {
                cardId,
                cardBefore: card,
                resolutionBefore: {
                  xpToSpend: prev.xpToSpend,
                  remainingDamage: prev.remainingDamage,
                  remainingTimePenalty: prev.remainingTimePenalty,
                  downgradedCardIds: [...prev.downgradedCardIds],
                },
                kind: "downgrade",
              },
            ],
          }
        : prev
    );
  }

  function applyUpgrade(cardId: string) {
    if (
      !resolution ||
      resolution.xpToSpend <= 0 ||
      resolution.remainingDamage > 0 ||
      resolution.remainingTimePenalty > 0
    ) {
      return;
    }

    if (resolution.downgradedCardIds.includes(cardId)) {
      return;
    }

    const card = cards[cardId];
    if (!card) {
      return;
    }

    const cost = card.level;
    if (resolution.xpToSpend < cost) {
      return;
    }

    const upgradedCard = {
      ...card,
      level: card.level + 1,
    };

    setCards((prev) => ({
      ...prev,
      [cardId]: upgradedCard,
    }));

    setResolution((prev) =>
      prev
        ? {
            ...prev,
            xpToSpend: prev.xpToSpend - cost,
            history: [
              ...prev.history,
              {
                cardId,
                cardBefore: card,
                resolutionBefore: {
                  xpToSpend: prev.xpToSpend,
                  remainingDamage: prev.remainingDamage,
                  remainingTimePenalty: prev.remainingTimePenalty,
                  downgradedCardIds: [...prev.downgradedCardIds],
                },
                kind: "upgrade",
              },
            ],
          }
        : prev
    );
  }

  function undoLastResolutionChange() {
    if (!resolution || resolution.history.length === 0) {
      return;
    }

    const lastEntry = resolution.history[resolution.history.length - 1];

    setCards((prev) => ({
      ...prev,
      [lastEntry.cardId]: lastEntry.cardBefore,
    }));

    setResolution((prev) =>
      prev
        ? {
            ...prev,
            xpToSpend: lastEntry.resolutionBefore.xpToSpend,
            remainingDamage: lastEntry.resolutionBefore.remainingDamage,
            remainingTimePenalty: lastEntry.resolutionBefore.remainingTimePenalty,
            downgradedCardIds: lastEntry.resolutionBefore.downgradedCardIds,
            history: prev.history.slice(0, -1),
          }
        : prev
    );
  }

  function applyTimePenalty() {
    if (!resolution || resolution.remainingTimePenalty <= 0) {
      return;
    }

    let overflowDamage = 0;

    setZones((prev) => {
      const next: Zones = {
        ...prev,
        hand: [...prev.hand],
        deck: [...prev.deck],
        discard: [...prev.discard],
      };

      for (let i = 0; i < resolution.remainingTimePenalty; i += 1) {
        const discarded = next.deck.shift();

        if (discarded) {
          next.discard.push(discarded);
        } else {
          overflowDamage += 1;
        }
      }

      return next;
    });

    setResolution((prev) =>
      prev
        ? {
            ...prev,
            remainingTimePenalty: 0,
            remainingDamage: prev.remainingDamage + overflowDamage,
          }
        : prev
    );
  }

  function finishResolution() {
    if (!resolution) {
      return;
    }

    if (campaign.phase === "dragon" && campaign.dragonStage === "journey") {
      const nextZones = setupDragonFightFromJourney(zones);
      setZones(nextZones);
      setFinalActionSets([]);
      setDragonJourneyRegroupUsed(true);
      setCampaign((prev) => ({
        ...prev,
        dragonStage: "fight",
        resolvedEncounters: prev.resolvedEncounters + 1,
      }));
      setResolution(null);
      setNotice("The Final Journey is over. Draw the rest of the deck and face the dragon.");
      return;
    }

    if (campaign.phase === "dragon" && campaign.dragonStage === "fight") {
      if (resolution.remainingDamage > 0) {
        return;
      }

      setCampaign((prev) => ({
        ...prev,
        phase: "complete",
        result: "victory",
        resolvedEncounters: prev.resolvedEncounters + 1,
      }));
      setResolution(null);
      setFinalActionSets([]);
      setNotice("You soaked the dragon's damage and survived. Campaign complete.");
      return;
    }

    const usedCardIds = [zones.action, zones.element, zones.bonusAction, zones.modifier].filter(
      (cardId): cardId is string => Boolean(cardId)
    );
    const leveledCards = { ...cards };

    let baseZones: Zones = {
      ...clearActionSet(zones),
      hand: [...zones.hand],
      deck: [...zones.deck],
      discard: [...zones.discard],
    };

    if (resolution.discardReserveOnCleanup && resolution.reserveCardId) {
      baseZones = removeCardFromZones(baseZones, resolution.reserveCardId);
      baseZones.discard.push(resolution.reserveCardId);
    }

    usedCardIds.forEach((cardId) => {
      if (leveledCards[cardId]?.level <= 0) {
        baseZones = removeCardFromZones(baseZones, cardId);
      } else {
        baseZones.discard.push(cardId);
      }
    });

    if (resolution.remainingTimePenalty > 0) {
      for (let i = 0; i < resolution.remainingTimePenalty; i += 1) {
        const discarded = baseZones.deck.shift();
        if (discarded) {
          baseZones.discard.push(discarded);
        }
      }
    }

    const remainingEncounterCards = baseZones.hand.length + baseZones.deck.length;
    let nextZones =
      campaign.phase === "region"
        ? refillHand(baseZones, { allowDiscardReshuffle: false })
        : refillHand(baseZones);
    let nextCampaign: CampaignState = {
      xp: campaign.xp + resolution.earnedXp,
      regionIndex: campaign.regionIndex,
      phase: campaign.phase,
      resolvedEncounters: campaign.resolvedEncounters + 1,
    };

    resolution.availableCardIds.forEach((cardId) => {
      if (leveledCards[cardId]?.level <= 0) {
        baseZones = removeCardFromZones(baseZones, cardId);
      }
    });

    if (campaign.phase === "dragon" && resolution.outcome === "complete") {
      nextCampaign = {
        ...nextCampaign,
        phase: "complete",
      };
    } else if (campaign.phase === "region" && remainingEncounterCards < 5) {
      if (campaign.regionIndex < regions.length - 1) {
        nextCampaign = {
          ...nextCampaign,
          regionIndex: campaign.regionIndex + 1,
          divertsUsed: 0,
        };
        nextZones = setupNextExpedition(leveledCards);
        setNotice(`Region cleared. Entering ${regions[campaign.regionIndex + 1].name}.`);
      } else {
        nextCampaign = {
          ...nextCampaign,
          phase: "dragon",
          dragonStage: "journey",
          divertsUsed: 0,
        };
        nextZones = setupDragonJourney(leveledCards);
        setFinalActionSets([]);
        setDragonJourneyRegroupUsed(false);
        setNotice("All four regions are complete. The Final Journey begins.");
      }
    }

    setCards(leveledCards);
    setCampaign(nextCampaign);
    setZones(nextZones);
    setResolution(null);
    setReserveCounterKey(null);
  }

  function skipToNextRegion() {
    if (campaign.phase === "complete") {
      return;
    }

    setResolution(null);
    setReserveCounterKey(null);
    setZones(setupNextExpedition(cards));

    if (campaign.phase === "dragon" || campaign.regionIndex >= regions.length - 1) {
      const dragonZones = setupDragonJourney(cards);
      setZones(dragonZones);
      setFinalActionSets([]);
      setDragonJourneyRegroupUsed(false);
      setCampaign((prev) => ({
        ...prev,
        phase: "dragon",
        regionIndex: regions.length - 1,
        dragonStage: "journey",
        divertsUsed: 0,
      }));
      setNotice("Skipped ahead to the Final Journey.");
      return;
    }

    const nextRegionIndex = campaign.regionIndex + 1;
    setCampaign((prev) => ({
      ...prev,
      regionIndex: nextRegionIndex,
      phase: "region",
      dragonStage: null,
    }));
    setNotice(`Skipped ahead to ${regions[nextRegionIndex].name}.`);
  }

  const nextEncounterAfterRegroup =
    campaign.phase === "region" && zones.deck.length > 1
      ? (() => {
          const nextKey = cards[zones.deck[1]];
          if (!nextKey) {
            return null;
          }
          const nextState = getCardKeyState(nextKey);
          return `${nextState.encounter.kind === "enemy" ? "Enemy" : "Journey"} ${nextState.encounter.value}`;
        })()
      : null;

  function enterRegroupMode() {
    if (resolution) {
      return;
    }

    if (campaign.phase === "region" && zones.hand.length > 0 && keyCard) {
      setRegroupMode(true);
      setNotice("Choose a hand card to discard for regroup.");
      return;
    }

    if (campaign.phase === "dragon" && campaign.dragonStage === "journey" && !dragonJourneyRegroupUsed && zones.hand.length === 7) {
      setRegroupMode(true);
      setNotice("Choose one card to discard, then redraw the Final Journey hand.");
    }
  }

  function handleRegroupDiscard(card: Card) {
    if (!regroupMode || resolution) {
      return;
    }

    if (campaign.phase === "region" && keyCard) {
      setZones((prev) => {
        const nextDeck = [...prev.deck];
        const currentKey = nextDeck.shift();
        if (currentKey) {
          nextDeck.push(currentKey);
        }
        return {
          ...prev,
          hand: prev.hand.filter((id) => id !== card.id),
          discard: [...prev.discard, card.id],
          deck: nextDeck,
        };
      });
      setCampaign((prev) => ({ ...prev, divertsUsed: prev.divertsUsed + 1 }));
      setRegroupMode(false);
      setNotice("Regrouped. A new encounter is on top of the deck.");
      return;
    }

    if (campaign.phase === "dragon" && campaign.dragonStage === "journey" && !dragonJourneyRegroupUsed) {
      setZones((prev) => {
        const remainingHand = prev.hand.filter((id) => id !== card.id);
        const reshuffledDeck = [...prev.deck, ...shuffle(remainingHand)];
        return {
          ...buildEmptyZones(),
          hand: reshuffledDeck.slice(0, 7),
          deck: reshuffledDeck.slice(7),
          discard: [...prev.discard, card.id],
        };
      });
      setDragonJourneyRegroupUsed(true);
      setRegroupMode(false);
      setNotice("Final Journey regroup used. Build your seven-card hand again.");
    }
  }

  function autoFillZones() {
    if (resolution) {
      return;
    }

    setZones((prev) => {
      const pool = [
        ...prev.hand,
        prev.action,
        prev.element,
        prev.bonusAction,
        prev.modifier,
      ].filter((cardId, index, arr): cardId is string => Boolean(cardId) && arr.indexOf(cardId) === index);

      const shuffledPool = shuffle(pool);

      return {
        hand: shuffledPool.slice(4),
        deck: [...prev.deck],
        discard: [...prev.discard],
        action: shuffledPool[0] ?? null,
        element: shuffledPool[1] ?? null,
        bonusAction: shuffledPool[2] ?? null,
        modifier: shuffledPool[3] ?? null,
        bonusInit: null,
      };
    });
  }

  const zoneCards = {
    action: zones.action ? cards[zones.action] : null,
    element: zones.element ? cards[zones.element] : null,
    modifier: zones.modifier ? cards[zones.modifier] : null,
    bonusAction: zones.bonusAction ? cards[zones.bonusAction] : null,
  };

  const handCards = zones.hand.map((id) => cards[id]).filter((card): card is Card => Boolean(card));
  const reserveCard =
    zones.hand.length === 1 && !zones.modifier && zones.action && zones.element && zones.bonusAction
      ? cards[zones.hand[0]]
      : null;

  if (!isClientReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[88rem] items-center justify-center px-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 px-6 py-5 text-sm text-slate-300 shadow-2xl">
            Loading campaign...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <DndContext onDragEnd={handleDragEnd}>
        <Board
          zones={zoneCards}
          currentRegion={currentRegion}
          currentEnemy={currentEnemy}
          currentAdventure={currentAdventure}
          currentDragon={campaign.phase === "dragon" ? dragon : null}
          nextEnemy={nextEnemy}
          nextAdventure={nextAdventure}
          encounterKind={encounterKind}
          currentHardship={currentKeyState?.hardship ?? null}
          preview={displayPreview}
          campaign={campaign}
          deckCount={zones.deck.length}
          discardCount={zones.discard.length}
          reserveCard={reserveCard}
          boostTarget={boostTarget}
          dragonStage={campaign.dragonStage}
          finalActionSets={finalActionSets.map((set) => ({ label: set.label, preview: set.preview }))}
          regroupMode={regroupMode}
          canRegroup={
            !resolution &&
            ((campaign.phase === "region" && Boolean(keyCard) && zones.hand.length > 0 && campaign.divertsUsed < 2) ||
              (campaign.phase === "dragon" &&
                campaign.dragonStage === "journey" &&
                !dragonJourneyRegroupUsed &&
                zones.hand.length === 7 &&
                finalActionSets.length === 0))
          }
          regroupPreview={campaign.phase === "region" ? nextEncounterAfterRegroup : null}
          resolution={resolution}
          resolutionCards={resolution ? resolution.availableCardIds.map((id) => cards[id]).filter(Boolean) : []}
          notice={notice}
          onDismissNotice={() => setNotice(null)}
          onBoostTargetChange={setBoostTarget}
          useReserveAgainstRanged={canUseReserveAgainstRanged && useReserveAgainstRanged}
          onUseReserveAgainstRangedChange={(value) =>
            setReserveCounterKey(value ? currentReserveCounterKey : null)
          }
          onEditActionSet={editDragonActionSet}
          onRegroup={enterRegroupMode}
          onResolve={resolveEncounter}
          onUpgradeCard={applyUpgrade}
          onDowngradeCard={applyDowngrade}
          onUndoLastChange={undoLastResolutionChange}
          onApplyTimePenalty={applyTimePenalty}
          onFinishResolution={finishResolution}
          returnToHandAction={returnToHandAction}
        />
        <Hand cards={handCards} onCardClick={regroupMode ? handleRegroupDiscard : undefined} />
      </DndContext>
      <div className="fixed top-4 left-[66px] z-50 flex max-h-[calc(100vh-2rem)] flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setTestControlsOpen((prev) => !prev)}
          className="rounded-full border border-white/10 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur"
          title={testControlsOpen ? "Close test menu" : "Open test menu"}
        >
          <FlaskConical className="h-5 w-5" />
        </button>
        {testControlsOpen ? (
          <div className="w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Testing</div>
                <div className="mt-1 text-sm font-semibold text-white">Debug Controls</div>
              </div>
              <button
                type="button"
                onClick={() => setTestControlsOpen(false)}
                className="rounded-full bg-slate-800 p-2 text-slate-200"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={skipToNextRegion}
              className="mt-4 w-full rounded-xl bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-950"
            >
              Skip To Next Region
            </button>
            <button
              type="button"
              onClick={autoFillZones}
              disabled={Boolean(resolution)}
              className="mt-2 w-full rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Auto Fill Zones
            </button>

            <div className="mt-4 space-y-3">
              {[
                { key: "attackModifier", label: "Attack", value: testControls.attackModifier },
                { key: "moveModifier", label: "Move", value: testControls.moveModifier },
                { key: "initiativeModifier", label: "Initiative", value: testControls.initiativeModifier },
              ].map((control) => (
                <div key={control.key} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-3 py-2">
                  <span className="text-sm text-slate-200">{control.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTestControls((prev) => ({
                          ...prev,
                          [control.key]: Math.max(-9, (prev[control.key as keyof TestControls] as number) - 1),
                        }))
                      }
                      className="h-7 w-7 rounded-full bg-slate-800 text-sm font-semibold text-white"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-white">{control.value}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTestControls((prev) => ({
                          ...prev,
                          [control.key]: Math.min(9, (prev[control.key as keyof TestControls] as number) + 1),
                        }))
                      }
                      className="h-7 w-7 rounded-full bg-slate-800 text-sm font-semibold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
              <span>Force Advanced Action</span>
              <button
                type="button"
                onClick={() =>
                  setTestControls((prev) => ({
                    ...prev,
                    forceAdvancedAction: !prev.forceAdvancedAction,
                  }))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  testControls.forceAdvancedAction ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-slate-200"
                }`}
              >
                {testControls.forceAdvancedAction ? "On" : "Off"}
              </button>
            </label>
          </div>
        ) : null}
      </div>
    </main>
  );
}
