"use client";

import React, { JSX, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "../Types/types";
import { Flame, Droplet, Mountain, Wind, Footprints, Sword, Zap } from "lucide-react";
import { ResistanceIcon } from "./ResistanceIcon";

const elementStyles: Record<string, string> = {
    fire: "bg-gradient-to-b from-red-500/70 to-red-800/20",
    water: "bg-gradient-to-b from-blue-400/70 to-blue-900/20",
    earth: "bg-gradient-to-b from-green-400/70  to-green-900/20",
    wind: "bg-gradient-to-b from-amber-300/70  to-amber-900/20",
};
const actionElementStyles: Record<string, string> = {
    fire: "bg-red-500/80",
    water: "bg-blue-400/80",
    earth: "bg-green-400/80",
    wind: "bg-amber-300/80",
};

const upgradePulseStyles: Record<string, string> = {
    // fire: "animate-pulse bg-red-500/30 ring-2 ring-red-400/50",
    fire: "animate-[pulse_2s_ease-in-out_infinite] bg-red-500/30 ring-2 ring-red-400/50 shadow-red-500/50 shadow-lg",
    water: "animate-pulse bg-blue-500/30 ring-2 ring-blue-400/50",
    earth: "animate-pulse bg-green-500/30 ring-2 ring-green-400/50",
    wind: "animate-pulse bg-amber-400/30 ring-2 ring-amber-300/50",
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
    const upgradeStyle = actionElementStyles[card.upgradeRequirement] ?? "bg-slate-300";
    const upgradePulse = upgradePulseStyles[card.upgradeRequirement] ?? "";
    // console.log(upgradeStyle)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onContextMenu={(e) => {
                e.preventDefault();
                onClickAction?.(card);
            }}
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
                        ${zone === "action" && upgraded ? upgradePulse : ""}
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
                    ${zoneOpacity("bonusAction")}
                    ${zoneHighlight("bonusAction")}`}>
                    <span>Bonus</span>
                    <span>{card.bonus}</span>
                </div>
                <div className={`flex justify-between
                    ${zoneOpacity("bonusInit")}
                    ${zoneHighlight("bonusInit")}`}>
                    <span>Bonus</span>
                    <span>{card.bonus}</span>
                </div>

            </div>

            {/* Resistance */}
            <div className={`text-xs border-t border-white/40 pt-1 flex justify-between items-center
                ${zone && zone !== 'elementasdas' ? 'opacity-50' : ''}`}>
                <span>Resist</span>
                <ResistanceIcon
                    element={card.resistance.element}
                    value={card.resistance.value}
                />
            </div>
        </div>
    );
}