"use client";

import { Card } from "../Types/types";
import CardComponent from "./Card";

export default function Hand({ cards }: { cards: Card[] }) {
  return (
    <div className="flex gap-4 mt-20">

      {cards.map((card) => (
        <CardComponent key={card.id} card={card} />
      ))}

    </div>
  );
}