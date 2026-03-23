"use client";

import { useEffect, useState, useCallback } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";

import deckData from "./data/cards.json";
import { Card } from "./Types/types";

import Hand from "./Components/Hand";
import Board from "./Components/Board";
import { ZoneRules } from "./Components/game/zoneRules";

  function shuffle<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5);
  }

type Zones = {
  hand: string[];
  deck: string[];
  discard: string[];
  action: string | null;
  element: string | null;
  modifier: string | null;
  bonusAction: string | null;
  bonusInit: string | null;
};

const typedDeck: Card[] = deckData as Card[];

export default function Home() {
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [zones, setZones] = useState<Zones>({
    hand: [],
    deck: [],
    discard: [],
    action: null,
    element: null,
    modifier: null,
    bonusAction: null,
    bonusInit: null
  });

  useEffect(() => {
    const shuffled = shuffle(typedDeck);

    const cardMap: Record<string, Card> = {};
    const hand: string[] = [];
    const deck: string[] = [];

    shuffled.forEach((card, i) => {
      cardMap[card.id] = card;
      if (i < 4) hand.push(card.id);
      else deck.push(card.id);
    });

    setCards(cardMap);
    setZones((prev) => ({
      ...prev,
      hand,
      deck
    }));
  }, []);

  const removeCardFromZones = (state: Zones, cardId: string) => {
    const next = { ...state };

    next.hand = next.hand.filter((id) => id !== cardId);
    next.deck = next.deck.filter((id) => id !== cardId);
    next.discard = next.discard.filter((id) => id !== cardId);

    Object.keys(next).forEach((k) => {
      const key = k as keyof Zones;
      if (next[key] === cardId) next[key] = null;
    });

    return next;
  };

const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return;

  const cardId = active.id as string;
  const zone = over.id as ZoneId;

  setZones((prev) => {
    let next = removeCardFromZones(prev, cardId);

    const rule = ZoneRules[zone];

    // handle exclusive zones
    if (rule.exclusiveWith) {
      const other = rule.exclusiveWith;

      if (next[other]) {
        next.hand.push(next[other]!);
        next[other] = null;
      }
    }

    // multi zones (hand/deck/discard)
    if (rule.type === "multi") {
      next[zone].push(cardId);
      return next;
    }

    // single zones
    const existing = next[zone];

    if (existing) {
      next.hand.push(existing);
    }

    next[zone] = cardId;

    return next;
  });
}, []);

  function returnToHandAction(card: Card) {
    setZones((prev) => {
      let next = removeCardFromZones(prev, card.id);
      next.hand.push(card.id);
      return next;
    });
  }

  const zoneCards = {
    action: zones.action ? cards[zones.action] : null,
    element: zones.element ? cards[zones.element] : null,
    bonusAction: zones.bonusAction ? cards[zones.bonusAction] : null,
    bonusInit: zones.bonusInit ? cards[zones.bonusInit] : null,
    modifier: zones.modifier ? cards[zones.modifier] : null
  };

  const handCards = zones.hand.map((id) => cards[id]);

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center text-white">
      <DndContext onDragEnd={handleDragEnd}>
        <Board zones={zoneCards} returnToHandAction={returnToHandAction} />
        <Hand cards={handCards} />
      </DndContext>
    </main>
  );
}