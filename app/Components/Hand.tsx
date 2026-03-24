"use client";

import { Card } from "../Types/types";
import CardComponent from "./Card";

export default function Hand({
  cards,
  onCardClick,
}: {
  cards: Card[];
  onCardClick?: (card: Card) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[88rem] flex-wrap justify-center gap-3 px-3 pb-6 sm:px-4">
      {cards.map((card) => (
        <CardComponent key={card.id} card={card} onClickAction={onCardClick} />
      ))}
    </div>
  );
}
