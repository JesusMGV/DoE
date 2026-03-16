"use client";

import { useEffect, useState, useCallback } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";

import deckData from "./data/cards.json";
import { Card } from "./Types/types";

import Hand from "./Components/Hand";
import Board from "./Components/Board";

  function shuffle<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5);
  }

  type Location = "hand" | "action" | "element" | "bonusInit" | "bonusAction" | "modifier" | "deck";

  type CardState = {
    card: Card;
    location: Location;
  };

  const typedDeck: Card[] = deckData as Card[];

export default function Home() {
  const [cards, setCards] = useState<CardState[]>([]);

  useEffect(() => {
    const shuffledDeck = shuffle(typedDeck);

    const initialCards: CardState[] = shuffledDeck.map((card, index) => ({
      card,
      location: index < 4 ? "hand" : "deck"
    }));

    setCards(initialCards);
  }, []);

  // const handleDragEnd = useCallback((event: DragEndEvent) => {
  //   const { active, over } = event;

  //   if (!over) return;

  //   const zone = over.id as Location;
  //   const cardId = active.id;

  //   setCards((prev) => {
  //     const updated = [...prev];
  //     const dragged = updated.find((c) => c.card.id === cardId);
  //     if (!dragged) return prev;

  //     const existing = updated.find((c) => c.location === zone);

  //     if (existing) {
  //       existing.location = "hand";
  //     }
  //     dragged.location = zone;
  //     return updated;
  //   });
  // }, []);

const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  const zone = over.id as Location;
  const cardId = active.id;

  setCards((prev) => {
    const updated = [...prev];

    const dragged = updated.find((c) => c.card.id === cardId);
    if (!dragged) return prev;

    const origin = dragged.location;

    const existing = updated.find((c) => c.location === zone);

    // Swap if zone already occupied
    if (existing) {
      existing.location = origin;
    }

    // BONUS ZONE RULE
    if (zone === "bonusAction" || zone === "bonusInit") {
      const otherBonusZone = zone === "bonusAction" ? "bonusInit" : "bonusAction";

      const otherBonusCard = updated.find((c) => c.location === otherBonusZone);

      if (otherBonusCard) {
        otherBonusCard.location = "hand";
      }
    }

    dragged.location = zone;

    return updated;
  });
}, []);

  function returnToHandAction(card: Card) {
    setCards((prev) => {
      const updated = [...prev];

      const target = updated.find((c) => c.card.id === card.id);
      if (!target) return prev;

      target.location = "hand";

      return updated;
    });
  }

  const hand = cards.filter((c) => c.location === "hand");

  const zones = {
    action: cards.find((c) => c.location === "action")?.card ?? null,
    element: cards.find((c) => c.location === "element")?.card ?? null,
    bonusAction: cards.find((c) => c.location === "bonusAction")?.card ?? null,
    bonusInit: cards.find((c) => c.location === "bonusInit")?.card ?? null,
    modifier: cards.find((c) => c.location === "modifier")?.card ?? null
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center text-white">
      <DndContext onDragEnd={handleDragEnd}>
        <Board zones={zones} returnToHandAction={returnToHandAction} />
        <Hand cards={hand.map((c) => c.card)} />
      </DndContext>
    </main>
  );
}