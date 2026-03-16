"use client";

import { useDroppable } from "@dnd-kit/core";
import { Card } from "../Types/types";
import CardComponent from "./Card";
// import Card

export default function DropZone({id, card, returnToHandAction, isUpgraded}: {
    id: string;
    card: Card | null;
    returnToHandAction: (card: Card) => void;
    isUpgraded: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const textId = {
        action: "Action",
        element: "Element",
        modifier: "Merge Spell",
        bonusAction: "Boost Action",
        bonusInit: "Boost Initiative"
    }

    return (
        <div ref={setNodeRef}
            className={`w-40 h-62 rounded-xl border-2 flex items-center justify-center transition
            ${isOver ? "border-green-400 bg-green-900/20" : "border-gray-600"}`}>
            {card ? null : textId[id as keyof typeof textId]}
            {card && <CardComponent card={card} zone={id} onClickAction={ () => returnToHandAction(card)} upgraded={isUpgraded}/>}
        </div>
    );
}