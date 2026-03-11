"use client";

import React, { JSX, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "../Types/types";
import { Flame, Droplet, Mountain, Wind, Footprints, Sword, Zap } from "lucide-react";
import { ResistanceIcon } from "./ResistanceIcon";

const elementStyles: Record<string, string> = {
    fire: "bg-gradient-to-br from-red-400/20 via-red-500 to-red-800/10",
    water: "bg-gradient-to-br from-blue-400/20 via-blue-500 to-blue-900/10",
    earth: "bg-gradient-to-br from-green-400/20 via-green-500 to-green-900/10",
    wind: "bg-gradient-to-br from-amber-300/20 via-amber-500 to-amber-900/10",
};

const elementIcons: Record<string, JSX.Element> = {
    fire: <Flame className="w-8 h-8" />,
    water: <Droplet className="w-8 h-8" />,
    earth: <Mountain className="w-8 h-8" />,
    wind: <Wind className="w-8 h-8" />,
};

export default function CardComponent({
    card,
    onClickAction,
    zone,
    upgraded
}: {
    card: Card;
    onClickAction?: (card: Card) => void;
    zone: string;
    upgraded: boolean;
}) {

    const wasDragging = useRef(false);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: card.id,
        onDragStart() {
            wasDragging.current = true;
        },
        onDragEnd() {
            setTimeout(() => {
                wasDragging.current = false;
            }, 0);
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    function zoneOpacity(expected: string) {
        return zone && zone !== expected ? "opacity-30" : "";
    }

    function zoneHighlight(expected: string) {
        return zone === expected
            ? "text-lg animate-pulse duration-[2000ms] bg-slate-900/80 p-1 rounded-lg"
            : "";
    }

    const elementStyle = elementStyles[card.element] ?? "bg-slate-300";
    const upgradeStyle = elementStyles[card.upgradeRequirement] ?? "bg-slate-300";

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => {
                if (wasDragging.current) return;
                onClickAction && onClickAction(card);
            }}
            className={`w-36 h-58 rounded-2xl ${elementStyle}
            border border-slate-700 shadow-xl p-3 cursor-grab
            active:cursor-grabbing select-none
            flex flex-col justify-between text-white`}
        >
            {/* Card Name */}
            <div className="text-center font-bold text-sm border-b border-white/40 pb-1 flex items-center justify-center gap-1">
                {card.name}
            </div>

            {/* Element Icon */}
            <div className={`flex justify-center mt-1
                ${zoneOpacity("element")}
                ${zoneHighlight("element")}`}>
                {elementIcons[card.element]}
            </div>

            {/* Card Body */}
            <div className="text-xs space-y-1 mt-2">

                <div className="flex justify-between">

                    {/* Base Action */}
                    <span
                        className={`border border-black font-semibold p-1 bg-slate-700/80 rounded-lg
                        ${zone === "action" && !upgraded ? "animate-pulse bg-slate-900/40" : ""}
                        ${zoneOpacity("action")}
                        ${zone === "action" && upgraded ? "opacity-30" : ""}
                        ${zone === "action" && !upgraded ? zoneHighlight("action") : ""}
                        ${zone === "action" ? "text-lg p-1" : ""}
                        `}
                    >
                        {card.action.type === "move"
                            ? <Footprints className="inline w-5 h-5" />
                            : <Sword className="inline w-5 h-5" />}
                        {card.action.value}
                    </span>

                    {/* Upgraded Action */}
                    <span
                        className={`border border-black font-semibold ${upgradeStyle} p-1 rounded-lg
                        ${zone === "action" && upgraded ? "animate-pulse bg-yellow-900/40" : ""}
                        ${zoneOpacity("action")}
                        ${zone === "action" && upgraded ? zoneHighlight("action") : ""}
                        ${zone === "action" && !upgraded ? "opacity-30" : ""}
                        ${zone === "action" ? "text-lg p-1" : ""}
                        `}
                    >
                        {card.upgradedAction.type === "move"
                            ? <Footprints className="inline w-5 h-5" />
                            : <Sword className="inline w-5 h-5" />}
                        {card.upgradedAction.value}
                    </span>

                </div>

                {/* Initiative */}
                <div className={`flex justify-between
                    ${zoneOpacity("element")}
                    ${zoneHighlight("element")}`}>
                    <span><Zap className="inline w-5 h-5" /></span>
                    <span>{card.initiative}</span>
                </div>

                {/* Bonus */}
                <div className={`flex justify-between
                    ${zoneOpacity("bonus")}
                    ${zoneHighlight("bonus")}`}>
                    <span>Bonus</span>
                    <span>{card.bonus}</span>
                </div>

            </div>

            {/* Resistance */}
            <div className={`text-xs border-t border-white/40 pt-1 flex justify-between items-center
                ${zone && zone !== 'element' ? 'opacity-50' : ''}`}>
                <span>Resist</span>
                <ResistanceIcon
                    element={card.resistance.element}
                    value={card.resistance.value}
                />
            </div>
        </div>
    );
}