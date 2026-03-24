"use client";

import { useDroppable } from "@dnd-kit/core";

import { Card } from "../Types/types";
import CardComponent from "./Card";

export default function DropZone({
  id,
  title,
  description,
  card,
  returnToHandAction,
}: {
  id: string;
  title: string;
  description: string;
  card: Card | null;
  returnToHandAction: (card: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-52 min-w-0 items-center justify-center rounded-[1.25rem] border-2 border-dashed p-2 transition ${
        isOver ? "border-cyan-400 bg-cyan-950/20" : "border-slate-700 bg-slate-950/60"
      }`}
    >
      {card ? (
        <CardComponent card={card} zone={id} onClickAction={() => returnToHandAction(card)} />
      ) : (
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{title}</div>
          <div className="mt-2 text-sm font-medium text-white">{description}</div>
        </div>
      )}
    </div>
  );
}
