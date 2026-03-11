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

  type Location = "hand" | "action" | "element" | "bonus" | "modifier" | "deck";

  type CardState = {
    card: Card;
    location: Location;
  };

  const typedDeck: Card[] = deckData as Card[];

export default function Home() {
  const [cards, setCards] = useState<CardState[]>([]);

  useEffect(() => {
    const shuffled = shuffle(typedDeck);

    const initialCards: CardState[] = shuffled.map((card, index) => ({
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

    // If a card already exists in the zone → swap them
    if (existing) {
      existing.location = origin;
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
    bonus: cards.find((c) => c.location === "bonus")?.card ?? null,
    modifier: cards.find((c) => c.location === "modifier")?.card ?? null
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center text-white">
      <DndContext onDragEnd={handleDragEnd}>
        <Board zones={zones} returnToHandAction={returnToHandAction} />
        <Hand cards={hand.map((c) => c.card)} />
      </DndContext>
    </div>
  );
}