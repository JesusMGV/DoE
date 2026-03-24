"use client";

import { JSX, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Droplets, Flame, Footprints, Mountain, Sword, Wind, Zap } from "lucide-react";

import { Card } from "../Types/types";
import { getCardLevelStats, getCardKeyState, hardshipMeta } from "./game/rulebookMeta";
import { ResistanceIcon } from "./ResistanceIcon";

const cardBackgrounds: Record<string, string> = {
  fire: "from-red-500/80 to-red-950",
  water: "from-cyan-400/80 to-cyan-950",
  earth: "from-emerald-500/80 to-emerald-950",
  wind: "from-amber-300/80 to-amber-950",
};

const upgradeBackgrounds: Record<string, string> = {
  fire: "bg-red-500/70",
  water: "bg-cyan-500/70",
  earth: "bg-emerald-500/70",
  wind: "bg-amber-400/70",
};

const elementIcons: Record<string, JSX.Element> = {
  fire: <Flame className="h-4 w-4" />,
  water: <Droplets className="h-4 w-4" />,
  earth: <Mountain className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
};

export default function CardComponent({
  card,
  onClickAction,
  zone = "",
}: {
  card: Card;
  onClickAction?: (card: Card) => void;
  zone?: string;
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
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const keyState = getCardKeyState(card);
  const stats = getCardLevelStats(card);
  const hardshipInfo = keyState.hardship ? hardshipMeta[keyState.hardship] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onContextMenu={(event) => {
        event.preventDefault();
        onClickAction?.(card);
      }}
      onClick={() => {
        if (wasDragging.current) {
          return;
        }

        onClickAction?.(card);
      }}
      className={`flex h-48 w-32 cursor-grab select-none flex-col justify-between rounded-[1.25rem] border border-white/10 bg-gradient-to-b ${cardBackgrounds[card.element] ?? "from-slate-500 to-slate-950"} p-2.5 text-white shadow-xl active:cursor-grabbing`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-4">{card.name}</div>
          </div>
          <div className="rounded-full bg-black/20 p-1.5">{elementIcons[card.element]}</div>
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="flex min-h-6 items-center gap-1">
            {hardshipInfo ? (
              <div
                title={`${hardshipInfo.label}: ${hardshipInfo.description}`}
                className="rounded-full border border-white/15 bg-black/20 p-1 text-white/80"
              >
                {hardshipInfo.icon}
              </div>
            ) : null}
          </div>
          <div className="shrink-0">
            <ResistanceIcon element={stats.resistance.element} value={stats.resistance.value} />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg bg-black/20 px-2 py-1 text-[11px]">
          <span className="inline-flex items-center gap-1">
            Lv {card.level}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className={`rounded-lg px-2 py-1 ${zone === "action" ? "bg-slate-950/85" : "bg-black/20"}`}>
            {stats.action.type === "move" ? (
              <Footprints className="mr-1 inline h-3.5 w-3.5" />
            ) : (
              <Sword className="mr-1 inline h-3.5 w-3.5" />
            )}
            {stats.action.value}
          </div>
          <div className={`rounded-lg px-2 py-1 ${zone === "element" ? "bg-slate-950/85" : "bg-black/20"}`}>
            <Zap className="mr-1 inline h-3.5 w-3.5" />
            {stats.initiative}
          </div>
          <div className={`rounded-lg px-2 py-1 ${zone === "bonusAction" ? "bg-slate-950/85" : "bg-black/20"}`}>
            +{stats.bonus}
          </div>
          <div className={`rounded-lg px-2 py-1 text-black ${upgradeBackgrounds[card.upgradeRequirement]}`}>
            {stats.upgradedAction.type === "move" ? (
              <Footprints className="mr-1 inline h-3.5 w-3.5" />
            ) : (
              <Sword className="mr-1 inline h-3.5 w-3.5" />
            )}
            {stats.upgradedAction.value}
          </div>
        </div>
      </div>

    </div>
  );
}
