"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AlertTriangle, Clock3, Droplets, Flame, Footprints, HeartCrack, Mountain, Shield, Skull, Sparkles, Sword, Wind, X, Zap } from "lucide-react";

import DropZone from "./DropZone";
import { enemyAbilityMeta, getCardLevelStats, getCardStatChanges, hardshipMeta, keywordMeta } from "./game/rulebookMeta";
import { Adventure, BattlePreview, Card, Dragon, EncounterKind, Enemy, HardshipKey, Region } from "../Types/types";
import { ResistanceIcon } from "./ResistanceIcon";

type CampaignState = {
  xp: number;
  regionIndex: number;
  phase: "region" | "dragon" | "complete";
  dragonStage: "journey" | "fight" | null;
  result: "victory" | "defeat" | null;
  resolvedEncounters: number;
  divertsUsed: number;
};

type BoostTarget = "action" | "initiative";
type EncounterResolution = {
  encounterKind: EncounterKind;
  outcome: "complete" | "narrow" | "loss";
  earnedXp: number;
  xpToSpend: number;
  remainingDamage: number;
  remainingTimePenalty: number;
  availableCardIds: string[];
  downgradedCardIds: string[];
  history: Array<{
    cardId: string;
    kind: "upgrade" | "downgrade";
  }>;
};

const elementIcons: Record<string, ReactNode> = {
  fire: <Flame className="h-4 w-4" />,
  water: <Droplets className="h-4 w-4" />,
  earth: <Mountain className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
};

const elementLabels: Record<string, string> = {
  fire: "Fire",
  water: "Water",
  earth: "Earth",
  wind: "Wind",
};

const upgradeHintBackgrounds: Record<string, string> = {
  fire: "bg-red-200 text-red-950",
  water: "bg-cyan-200 text-cyan-950",
  earth: "bg-emerald-200 text-emerald-950",
  wind: "bg-amber-200 text-amber-950",
};

const regionThemes: Record<string, {
  shellBorder: string;
  shellGlow: string;
  accentText: string;
  accentBorder: string;
  accentSurface: string;
}> = {
  region_1: {
    shellBorder: "border-amber-200/20",
    shellGlow: "shadow-[0_0_0_1px_rgba(253,224,71,0.05),0_20px_60px_rgba(245,158,11,0.08)]",
    accentText: "text-amber-200",
    accentBorder: "border-amber-300/20",
    accentSurface: "bg-amber-950/20",
  },
  region_2: {
    shellBorder: "border-emerald-300/20",
    shellGlow: "shadow-[0_0_0_1px_rgba(110,231,183,0.05),0_20px_60px_rgba(16,185,129,0.1)]",
    accentText: "text-emerald-200",
    accentBorder: "border-emerald-300/20",
    accentSurface: "bg-emerald-950/20",
  },
  region_3: {
    shellBorder: "border-cyan-300/20",
    shellGlow: "shadow-[0_0_0_1px_rgba(103,232,249,0.05),0_20px_60px_rgba(14,165,233,0.1)]",
    accentText: "text-cyan-200",
    accentBorder: "border-cyan-300/20",
    accentSurface: "bg-cyan-950/20",
  },
  region_4: {
    shellBorder: "border-violet-300/20",
    shellGlow: "shadow-[0_0_0_1px_rgba(196,181,253,0.05),0_20px_60px_rgba(139,92,246,0.12)]",
    accentText: "text-violet-200",
    accentBorder: "border-violet-300/20",
    accentSurface: "bg-violet-950/20",
  },
  dragon: {
    shellBorder: "border-rose-300/20",
    shellGlow: "shadow-[0_0_0_1px_rgba(251,113,133,0.06),0_20px_60px_rgba(225,29,72,0.14)]",
    accentText: "text-rose-200",
    accentBorder: "border-rose-300/20",
    accentSurface: "bg-rose-950/20",
  },
};

function svgBackground(svg: string) {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

const dragonBackground = svgBackground(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#450a0a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="embers" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="#fb7185" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="480" fill="url(#sky)"/>
  <rect width="800" height="480" fill="url(#embers)"/>
  <path d="M0 390 C154 340 292 324 412 338 C566 356 676 334 800 284 L800 480 L0 480 Z" fill="#111827"/>
  <path d="M178 330 C246 252 310 214 374 214 C436 214 494 242 558 318" stroke="#fb7185" stroke-opacity="0.84" stroke-width="26" fill="none" stroke-linecap="round"/>
  <path d="M374 214 C404 152 450 128 506 142 C566 156 622 208 664 286" stroke="#fda4af" stroke-opacity="0.78" stroke-width="20" fill="none" stroke-linecap="round"/>
  <path d="M466 168 L564 122 L532 198 Z" fill="#fecaca" fill-opacity="0.82"/>
  <path d="M274 284 C330 244 390 236 454 260" stroke="#fde68a" stroke-opacity="0.78" stroke-width="16" fill="none" stroke-linecap="round"/>
  <circle cx="272" cy="278" r="12" fill="#fbbf24" fill-opacity="0.88"/>
  <circle cx="312" cy="262" r="8" fill="#f97316" fill-opacity="0.82"/>
</svg>
`);

const enemyBackgroundsById: Record<string, string> = {
  emberWolf: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#1f2937"/>
    <path d="M0 352 C146 298 268 286 406 308 C550 332 660 318 800 270 L800 480 L0 480 Z" fill="#111827"/>
    <path d="M0 300 C154 248 300 238 434 264 C566 288 680 280 800 240 L800 480 L0 480 Z" fill="#7f1d1d" fill-opacity="0.8"/>
    <path d="M238 304 L292 240 L358 214 L452 212 L522 242 L588 286 L542 298 L504 344 L396 348 L302 336 Z" fill="#fb923c" fill-opacity="0.8"/>
    <path d="M410 202 L450 156 L498 174 L470 214 Z" fill="#fdba74" fill-opacity="0.92"/>
    <path d="M502 176 L540 142 L560 194 Z" fill="#fef3c7" fill-opacity="0.9"/>
    <circle cx="456" cy="194" r="8" fill="#fff7ed"/>
    <circle cx="458" cy="194" r="4" fill="#111827"/>
    <path d="M474 216 L524 226 L480 246 Z" fill="#111827" fill-opacity="0.72"/>
    <path d="M266 316 L228 370 L286 338" fill="#fdba74" fill-opacity="0.78"/>
    <path d="M552 310 L618 350 L548 338" fill="#fb923c" fill-opacity="0.72"/>
  </svg>
  `),
  mireDrake: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#082f49"/>
    <path d="M0 340 C114 306 238 306 360 338 C512 380 644 372 800 320 L800 480 L0 480 Z" fill="#0f172a"/>
    <path d="M0 306 C158 266 288 264 424 292 C552 318 676 312 800 278 L800 480 L0 480 Z" fill="#0f766e" fill-opacity="0.72"/>
    <path d="M146 298 C230 246 324 230 414 244 C482 254 542 288 620 334" stroke="#67e8f9" stroke-opacity="0.78" stroke-width="26" fill="none" stroke-linecap="round"/>
    <path d="M390 244 L438 186 L504 190 L548 236 L524 272 L454 270 Z" fill="#22d3ee" fill-opacity="0.82"/>
    <path d="M500 194 L536 160 L560 216 Z" fill="#dbeafe" fill-opacity="0.88"/>
    <circle cx="470" cy="224" r="7" fill="#f8fafc"/>
    <circle cx="472" cy="224" r="3.5" fill="#0f172a"/>
    <path d="M534 242 L582 262 L526 278 Z" fill="#164e63"/>
    <path d="M284 262 L246 208 L320 238" fill="#67e8f9" fill-opacity="0.66"/>
  </svg>
  `),
  stoneSentinel: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#1c1917"/>
    <path d="M0 372 C180 324 330 316 474 338 C612 360 704 344 800 310 L800 480 L0 480 Z" fill="#0f172a"/>
    <path d="M0 310 L126 252 L212 286 L334 198 L446 258 L576 176 L718 274 L800 242 L800 480 L0 480 Z" fill="#365314" fill-opacity="0.72"/>
    <path d="M344 344 L344 236 L404 178 L470 182 L522 236 L522 344 Z" fill="#94a3b8" fill-opacity="0.8"/>
    <path d="M366 220 L404 154 L460 154 L492 218 L456 254 L392 252 Z" fill="#cbd5e1" fill-opacity="0.86"/>
    <rect x="384" y="262" width="24" height="82" fill="#475569"/>
    <rect x="434" y="262" width="24" height="82" fill="#475569"/>
    <circle cx="414" cy="210" r="8" fill="#f8fafc"/>
    <circle cx="442" cy="210" r="8" fill="#f8fafc"/>
    <rect x="388" y="206" width="12" height="8" fill="#0f172a"/>
    <rect x="436" y="206" width="12" height="8" fill="#0f172a"/>
  </svg>
  `),
  skyRaptor: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#172554"/>
    <circle cx="650" cy="102" r="48" fill="#fef3c7" fill-opacity="0.76"/>
    <path d="M0 388 C148 328 286 320 430 340 C576 360 680 334 800 284 L800 480 L0 480 Z" fill="#0f172a"/>
    <path d="M180 188 C256 152 334 150 410 180 C486 208 562 212 642 188" stroke="#e0f2fe" stroke-opacity="0.74" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M242 274 L346 218 L430 232 L520 198 L604 222 L542 254 L470 262 L404 286 L340 294 Z" fill="#f8fafc" fill-opacity="0.82"/>
    <path d="M414 230 L468 150 L546 160 L502 226 Z" fill="#fde68a" fill-opacity="0.78"/>
    <path d="M534 164 L592 128 L578 190 Z" fill="#fef3c7" fill-opacity="0.86"/>
    <circle cx="486" cy="198" r="7" fill="#0f172a"/>
    <path d="M500 222 L562 240 L508 258 Z" fill="#1e293b"/>
    <path d="M322 246 L270 206 L330 220" fill="#cbd5e1" fill-opacity="0.72"/>
  </svg>
  `),
};

const enemyBackgroundsByElement: Record<string, string> = {
  fire: enemyBackgroundsById.emberWolf,
  water: enemyBackgroundsById.mireDrake,
  earth: enemyBackgroundsById.stoneSentinel,
  wind: enemyBackgroundsById.skyRaptor,
};

const journeyBackgroundsById: Record<string, string> = {
  ashPath: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <defs>
      <linearGradient id="ashsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c2d12"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
    </defs>
    <rect width="800" height="480" fill="url(#ashsky)"/>
    <path d="M0 320 C148 258 276 262 404 294 C544 330 672 320 800 270 L800 480 L0 480 Z" fill="#451a03"/>
    <path d="M0 370 C150 334 304 318 432 334 C580 352 694 336 800 306 L800 480 L0 480 Z" fill="#0f172a"/>
    <path d="M196 480 C234 394 284 328 358 262 C402 222 462 180 524 154" stroke="#fde68a" stroke-opacity="0.82" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M526 154 L556 156 L540 182" stroke="#fde68a" stroke-opacity="0.82" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="278" cy="348" r="14" fill="#f97316" fill-opacity="0.72"/>
    <circle cx="328" cy="298" r="10" fill="#fb7185" fill-opacity="0.62"/>
  </svg>
  `),
  tideVault: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#082f49"/>
    <circle cx="632" cy="100" r="52" fill="#dbeafe" fill-opacity="0.65"/>
    <path d="M0 348 C130 308 258 306 390 340 C546 382 664 372 800 326 L800 480 L0 480 Z" fill="#0f172a"/>
    <path d="M0 300 C144 266 290 272 430 310 C562 346 678 344 800 304 L800 480 L0 480 Z" fill="#155e75" fill-opacity="0.74"/>
    <rect x="294" y="156" width="212" height="162" rx="18" fill="#164e63" fill-opacity="0.72" stroke="#7dd3fc" stroke-opacity="0.78" stroke-width="8"/>
    <path d="M336 188 H464 V286 H336 Z" fill="none" stroke="#bae6fd" stroke-opacity="0.8" stroke-width="10"/>
    <circle cx="400" cy="238" r="24" fill="none" stroke="#e0f2fe" stroke-opacity="0.86" stroke-width="10"/>
    <path d="M136 280 C226 250 302 248 380 278 C470 312 562 314 664 286" stroke="#7dd3fc" stroke-opacity="0.72" stroke-width="14" fill="none" stroke-linecap="round"/>
  </svg>
  `),
  rootMaze: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#052e16"/>
    <path d="M0 386 C164 330 292 322 420 344 C560 368 684 350 800 306 L800 480 L0 480 Z" fill="#0f172a"/>
    <rect x="208" y="100" width="384" height="244" rx="18" fill="#14532d" fill-opacity="0.72" stroke="#86efac" stroke-opacity="0.72" stroke-width="8"/>
    <path d="M252 136 V310 H548" stroke="#dcfce7" stroke-opacity="0.76" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M318 136 H548 V202 H382 V268 H512 V310" stroke="#bbf7d0" stroke-opacity="0.76" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M252 202 H338 V244 H252" stroke="#bbf7d0" stroke-opacity="0.76" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M448 202 V136" stroke="#bbf7d0" stroke-opacity="0.76" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M208 100 C168 122 140 158 132 214" stroke="#65a30d" stroke-opacity="0.58" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M592 344 C646 350 690 336 738 302" stroke="#65a30d" stroke-opacity="0.58" stroke-width="18" fill="none" stroke-linecap="round"/>
  </svg>
  `),
  stormBridge: svgBackground(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
    <rect width="800" height="480" fill="#172554"/>
    <circle cx="636" cy="92" r="44" fill="#f8fafc" fill-opacity="0.42"/>
    <path d="M0 390 C142 334 278 322 416 342 C558 362 676 338 800 294 L800 480 L0 480 Z" fill="#0f172a"/>
    <path d="M180 250 C282 214 374 206 458 220 C530 232 604 258 682 304" stroke="#e0f2fe" stroke-opacity="0.74" stroke-width="8" fill="none"/>
    <path d="M160 286 L262 226 L394 214 L520 224 L648 282" stroke="#fde68a" stroke-opacity="0.86" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M198 286 L198 344 M268 246 L268 324 M338 222 L338 308 M408 216 L408 304 M478 222 L478 316 M548 246 L548 332 M618 278 L618 350" stroke="#cbd5e1" stroke-opacity="0.7" stroke-width="8" />
    <path d="M104 152 C188 120 282 124 372 156 C458 186 564 192 688 156" stroke="#7dd3fc" stroke-opacity="0.64" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M138 198 C232 164 320 166 398 194 C470 220 564 226 654 204" stroke="#bae6fd" stroke-opacity="0.52" stroke-width="10" fill="none" stroke-linecap="round"/>
  </svg>
  `),
};

function HoverHint({
  label,
  description,
  children,
}: {
  label: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-left shadow-2xl group-hover:block">
        <div className="text-[11px] font-semibold text-white">{label}</div>
        <div className="mt-1 text-[11px] leading-4 text-slate-300">{description}</div>
      </div>
    </div>
  );
}

function RegroupDropZone({
  label,
  preview,
}: {
  label: string;
  preview: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "regroupDiscard" });

  return (
    <HoverHint label={label} description={preview}>
      <div
        ref={setNodeRef}
        className={`rounded-xl border border-dashed px-3 py-2 text-[11px] font-semibold text-slate-100 transition ${
          isOver ? "border-cyan-300 bg-cyan-950/40" : "border-white/15 bg-slate-950/75"
        }`}
      >
        Discard a card to regroup
      </div>
    </HoverHint>
  );
}

function Pill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  description,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  description: ReactNode;
}) {
  return (
    <HoverHint label={label} description={description}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs text-slate-100">
        {icon}
        <span>{value}</span>
      </div>
    </HoverHint>
  );
}

function StatChangeStrip({
  card,
  targetLevel,
  label,
}: {
  card: Card;
  targetLevel: number;
  label: string;
}) {
  if (targetLevel < 1) {
    return (
      <div className="mt-1 flex items-center gap-2 text-[10px] text-rose-200">
        <span className="uppercase tracking-[0.18em] text-slate-500">{label}</span>
        <span className="rounded-full bg-rose-950/60 px-2 py-0.5">Trash</span>
      </div>
    );
  }

  const changes = getCardStatChanges(card, targetLevel);

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300">
      <span className="uppercase tracking-[0.18em] text-slate-500">{label}</span>
      {changes.map((change) => (
        <span
          key={`${card.id}-${label}-${change.key}`}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
            change.key === "upgradedAction"
              ? upgradeHintBackgrounds[card.upgradeRequirement] ?? "bg-slate-200 text-slate-950"
              : change.key === "resistance" && change.tone
                ? change.tone
              : "border border-white/10 bg-slate-800/80 text-slate-300"
          }`}
        >
          {change.icon}
          {change.from}
          <span className="text-slate-500">→</span>
          {change.to}
        </span>
      ))}
    </div>
  );
}

export default function Board({
  zones,
  currentRegion,
  currentEnemy,
  currentAdventure,
  currentDragon,
  nextEnemy,
  nextAdventure,
  encounterKind,
  currentHardship,
  preview,
  campaign,
  deckCount,
  discardCount,
  reserveCard,
  boostTarget,
  useReserveAgainstRanged,
  dragonStage,
  finalActionSets,
  canRegroup,
  resolution,
  resolutionCards,
  notice,
  onDismissNotice,
  onBoostTargetChange,
  onUseReserveAgainstRangedChange,
  onEditActionSet,
  onResolve,
  onUpgradeCard,
  onDowngradeCard,
  onUndoLastChange,
  onApplyTimePenalty,
  onFinishResolution,
  returnToHandAction,
}: {
  zones: {
    action: Card | null;
    element: Card | null;
    modifier: Card | null;
    bonusAction: Card | null;
  };
  currentRegion: Region;
  currentEnemy: Enemy | null;
  currentAdventure: Adventure | null;
  currentDragon: Dragon | null;
  nextEnemy: Enemy | null;
  nextAdventure: Adventure | null;
  encounterKind: EncounterKind;
  currentHardship: HardshipKey | null;
  preview: BattlePreview | null;
  campaign: CampaignState;
  deckCount: number;
  discardCount: number;
  reserveCard: Card | null;
  boostTarget: BoostTarget;
  useReserveAgainstRanged: boolean;
  dragonStage: "journey" | "fight" | null;
  finalActionSets: Array<{
    label: string;
    preview: BattlePreview;
  }>;
  canRegroup: boolean;
  resolution: EncounterResolution | null;
  resolutionCards: Card[];
  notice: string | null;
  onDismissNotice: () => void;
  onBoostTargetChange: (target: BoostTarget) => void;
  onUseReserveAgainstRangedChange: (value: boolean) => void;
  onEditActionSet: (index: number) => void;
  onResolve: () => void;
  onUpgradeCard: (cardId: string) => void;
  onDowngradeCard: (cardId: string) => void;
  onUndoLastChange: () => void;
  onApplyTimePenalty: () => void;
  onFinishResolution: () => void;
  returnToHandAction: (card: Card) => void;
}) {
  const hardshipInfo = currentHardship ? hardshipMeta[currentHardship] : null;
  const regionTheme =
    campaign.phase === "dragon"
      ? regionThemes.dragon
      : regionThemes[currentRegion.id] ?? regionThemes.region_1;
  const needsDowngrades = Boolean(resolution && resolution.remainingDamage > 0);
  const canSpendUpgrades = Boolean(
    resolution &&
      resolution.remainingDamage === 0 &&
      resolution.remainingTimePenalty === 0 &&
      resolution.xpToSpend > 0,
  );
  const encounterBackground =
    encounterKind === "dragon"
      ? dragonBackground
      : encounterKind === "adventure"
        ? currentAdventure
          ? journeyBackgroundsById[currentAdventure.id]
          : undefined
        : currentEnemy
          ? enemyBackgroundsById[currentEnemy.id] ?? enemyBackgroundsByElement[currentEnemy.element]
          : undefined;
  const encounterCard =
    encounterKind === "enemy" && currentEnemy
      ? {
          title: currentEnemy.name,
          icon: elementIcons[currentEnemy.element],
          lines: [
            `HP ${currentEnemy.health} | Attack ${currentEnemy.attack} | Init ${currentEnemy.initiative}`,
            `Armor ${currentEnemy.armor}${currentEnemy.resistanceElement ? ` | ${elementLabels[currentEnemy.resistanceElement]} Resist 1` : ""} | Early ${currentEnemy.earlyDamage}`,
          ],
          detail: currentEnemy.description,
          tag: null,
        }
      : encounterKind === "adventure" && currentAdventure
        ? {
            title: currentAdventure.name,
            icon: <Footprints className="h-4 w-4" />,
            lines: [
              `MP ${currentAdventure.targetProgress} | Time ${currentAdventure.timePenalty}`,
            ],
            detail: currentAdventure.objective,
            tag: {
              label: `Hazard: ${hardshipMeta[currentAdventure.peril].label}`,
              description: hardshipMeta[currentAdventure.peril].description,
              icon: hardshipMeta[currentAdventure.peril].icon,
              tone: "warn" as const,
            },
          }
      : currentDragon
          ? {
              title: currentDragon.name,
              icon: elementIcons[currentDragon.element],
              lines: [
                dragonStage === "journey"
                  ? `Journey MP ${currentDragon.journeyTiers.join(" / ")} | Time ${currentDragon.journeyPenalties.join(" / ")}`
                  : `HP ${currentDragon.healthTiers.join(" / ")} | Attack ${currentDragon.attackTiers.join(" / ")} | Init ${currentDragon.initiative}`,
                `Armor ${currentDragon.armor} | ${elementLabels[currentDragon.element]} Resist 1 | Early ${currentDragon.earlyDamage} ${elementLabels[currentDragon.element]}`,
              ],
              detail: currentDragon.description,
              tag: null,
            }
          : null;

  const nextEncounterCard =
    nextEnemy
      ? {
          label: "Enemy",
          icon: <Skull className="h-4 w-4" />,
          title: nextEnemy.name,
          lines: [
            `HP ${nextEnemy.health} | Init ${nextEnemy.initiative}`,
            `Atk ${nextEnemy.attack}${nextEnemy.attackElement ? ` ${elementLabels[nextEnemy.attackElement]}` : ""} | Armor ${nextEnemy.armor}`,
          ],
          tag: nextEnemy.ability
            ? {
                label: enemyAbilityMeta[nextEnemy.ability].label,
                description: enemyAbilityMeta[nextEnemy.ability].description,
                icon: enemyAbilityMeta[nextEnemy.ability].icon,
              }
            : nextEnemy.resistanceElement
              ? {
                  label: `${elementLabels[nextEnemy.resistanceElement]} Resist 1`,
                  description: `Attacking with ${elementLabels[nextEnemy.resistanceElement].toLowerCase()} deals 1 less damage to this enemy.`,
                  icon: elementIcons[nextEnemy.resistanceElement],
                }
              : null,
        }
      : nextAdventure
        ? {
            label: "Journey",
            icon: <Footprints className="h-4 w-4" />,
            title: nextAdventure.name,
            lines: [
              `MP ${nextAdventure.targetProgress} | Time ${nextAdventure.timePenalty}`,
            ],
            tag: {
              label: hardshipMeta[nextAdventure.peril].label,
              description: hardshipMeta[nextAdventure.peril].description,
              icon: hardshipMeta[nextAdventure.peril].icon,
            },
          }
        : null;
  const regroupPreviewContent =
    nextEncounterCard ? (
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200">
          {nextEncounterCard.icon}
          {nextEncounterCard.label}
        </div>
        <div className="text-xs font-semibold text-white">{nextEncounterCard.title}</div>
        {nextEncounterCard.lines.map((line) => (
          <div key={line} className="text-[11px] leading-4 text-slate-300">
            {line}
          </div>
        ))}
      </div>
    ) : (
      <div className="text-[11px] leading-4 text-slate-300">
        Discard one card, then redraw the Final Journey hand.
      </div>
    );

  return (
    <section className="mx-auto w-full max-w-[78rem] px-3 py-4 sm:px-4">
      <div className={`rounded-[2rem] border bg-slate-950/70 p-4 shadow-2xl ${regionTheme.shellBorder} ${regionTheme.shellGlow}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={`text-[10px] uppercase tracking-[0.35em] ${regionTheme.accentText}`}>Deck Of Elements</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">Four Region Campaign</h1>
            <p className="mt-1 text-sm text-slate-400">{campaign.phase === "dragon" ? "Dragon Finale" : currentRegion.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Pill label="Region" value={`${currentRegion.level}/4`} />
            <Pill label="Campaign XP" value={<span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-cyan-300" />{campaign.xp}</span>} />
            <Pill label="Encounters" value={campaign.resolvedEncounters} />
            <Pill label="Deck" value={deckCount} />
            <Pill label="Discard" value={discardCount} />
          </div>
        </div>

        {notice ? (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            <div>{notice}</div>
            <button
              type="button"
              onClick={onDismissNotice}
              className="rounded-full bg-amber-100/10 p-1 text-amber-100 transition hover:bg-amber-100/20"
              title="Dismiss notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_18rem]">
          <div className="space-y-3">
            {campaign.phase === "region" && nextEncounterCard ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Next Encounter</div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                      {nextEncounterCard.icon}
                      {nextEncounterCard.label}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">{nextEncounterCard.title}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-900/80 p-1 text-slate-200">
                    {nextEncounterCard.icon}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-slate-300">
                  {nextEncounterCard.lines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
                {nextEncounterCard.tag ? (
                  <div className="mt-3">
                    <HoverHint
                      label={nextEncounterCard.tag.label}
                      description={nextEncounterCard.tag.description}
                    >
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        {nextEncounterCard.tag.icon}
                        {nextEncounterCard.tag.label}
                      </div>
                    </HoverHint>
                  </div>
                ) : null}
                {nextEnemy ? (
                  <div className="mt-3 text-xs text-slate-400">
                    Same-element attack resistance and abilities are shown here before you regroup.
                  </div>
                ) : null}
                </div>
            ) : null}

            {reserveCard ? (
              <div className={`rounded-[1.5rem] border bg-slate-900/80 p-4 ${regionTheme.accentBorder}`}>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Reserve Card</div>
                <div className="mt-3 text-sm font-semibold text-white">{reserveCard.name}</div>
                <div className="mt-1 text-sm text-slate-300">
                  Drag it to Merge to force the upgraded action.
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {encounterCard ? (
              <div
                className={`relative overflow-hidden rounded-[1.5rem] border bg-slate-900/85 p-4 ${regionTheme.accentBorder}`}
                style={{
                  backgroundImage: `${encounterBackground}, linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(2,6,23,0.88) 100%)`,
                  backgroundSize: "cover, auto",
                  backgroundPosition: "center",
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
                <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[10px] uppercase tracking-[0.3em] ${regionTheme.accentText}`}>
                      {encounterKind === "dragon" ? "Final Battle" : encounterKind === "enemy" ? "Enemy" : "Journey"}
                    </div>
                    <div className="mt-1 text-xl font-semibold text-white">{encounterCard.title}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    {canRegroup ? (
                      <RegroupDropZone
                        label={dragonStage === "journey" ? "Regroup" : "Regroup / Divert"}
                        preview={regroupPreviewContent}
                      />
                    ) : null}
                    <div className="rounded-full border border-white/10 bg-slate-950/70 p-2 text-cyan-200">
                      {encounterCard.icon}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-300">
                  {encounterKind === "enemy" && currentEnemy ? (
                    <>
                      <StatPill
                        icon={<span className="text-[10px] font-semibold text-slate-300">HP</span>}
                        value={currentEnemy.health}
                        label="Health"
                        description="Damage needed for a complete victory."
                      />
                      <StatPill
                        icon={currentEnemy.attackElement ? elementIcons[currentEnemy.attackElement] : <Sword className="h-3.5 w-3.5" />}
                        value={currentEnemy.attack}
                        label="Attack"
                        description={`Enemy combat damage${currentEnemy.attackElement ? ` using the ${elementLabels[currentEnemy.attackElement].toLowerCase()} element` : ""}.`}
                      />
                      <StatPill
                        icon={<Zap className="h-3.5 w-3.5" />}
                        value={currentEnemy.initiative}
                        label="Initiative"
                        description="Beat this to avoid normal early damage."
                      />
                      <StatPill
                        icon={<Shield className="h-3.5 w-3.5 text-slate-300" />}
                        value={currentEnemy.armor}
                        label="Armor"
                        description={keywordMeta.armor.description}
                      />
                      {currentEnemy.resistanceElement ? (
                        <StatPill
                          icon={<ResistanceIcon element={currentEnemy.resistanceElement} value={1} />}
                          value={1}
                          label="Elemental Resistance"
                          description={`Attacking with ${elementLabels[currentEnemy.resistanceElement].toLowerCase()} deals 1 less damage to this enemy.`}
                        />
                      ) : null}
                      <StatPill
                        icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-300" />}
                        value={currentEnemy.earlyDamage}
                        label="Early"
                        description={`${keywordMeta.early.description}${currentEnemy.attackElement ? ` This damage uses the ${elementLabels[currentEnemy.attackElement].toLowerCase()} element.` : ""}`}
                      />
                    </>
                  ) : null}
                  {encounterKind === "adventure" && currentAdventure ? (
                    <>
                      <StatPill
                        icon={<Footprints className="h-3.5 w-3.5" />}
                        value={currentAdventure.targetProgress}
                        label="Move target"
                        description="Total move needed to clear the journey."
                      />
                      <StatPill
                        icon={<Clock3 className="h-3.5 w-3.5" />}
                        value={currentAdventure.timePenalty}
                        label="Time"
                        description={keywordMeta.time.description}
                      />
                    </>
                  ) : null}
                  {encounterKind === "dragon" && currentDragon ? (
                    <>
                      <StatPill
                        icon={<span className="text-[10px] font-semibold text-slate-300">HP</span>}
                        value={currentDragon.healthTiers.join("/")}
                        label="Dragon health tiers"
                        description="Attack thresholds for the final fight."
                      />
                      <StatPill
                        icon={elementIcons[currentDragon.element]}
                        value={currentDragon.attackTiers.join("/")}
                        label="Dragon damage tiers"
                        description={`Final damage to soak at each dragon tier, using the ${elementLabels[currentDragon.element].toLowerCase()} element.`}
                      />
                      <StatPill
                        icon={<Zap className="h-3.5 w-3.5" />}
                        value={currentDragon.initiative}
                        label="Initiative"
                        description="Beat this to avoid the dragon's early hit."
                      />
                      <StatPill
                        icon={<Shield className="h-3.5 w-3.5 text-slate-300" />}
                        value={currentDragon.armor}
                        label="Armor"
                        description={keywordMeta.armor.description}
                      />
                      <StatPill
                        icon={<ResistanceIcon element={currentDragon.element} value={1} />}
                        value={1}
                        label="Elemental Resistance"
                        description={`Attacking with ${elementLabels[currentDragon.element].toLowerCase()} deals 1 less damage to the dragon.`}
                      />
                      <StatPill
                        icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-300" />}
                        value={currentDragon.earlyDamage}
                        label="Early"
                        description={`Early damage using the ${elementLabels[currentDragon.element].toLowerCase()} element.`}
                      />
                    </>
                  ) : null}
                </div>
                <div className="mt-3 text-sm text-slate-300">{encounterCard.detail}</div>
                {encounterKind === "enemy" && currentEnemy?.ability ? (
                  <div className="mt-3">
                    <HoverHint
                      label={enemyAbilityMeta[currentEnemy.ability].label}
                      description={enemyAbilityMeta[currentEnemy.ability].description}
                    >
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-950/50 px-2.5 py-1 text-xs text-amber-100">
                        {enemyAbilityMeta[currentEnemy.ability].icon}
                        {enemyAbilityMeta[currentEnemy.ability].label}
                      </div>
                    </HoverHint>
                  </div>
                ) : null}
                {encounterKind === "adventure" && currentAdventure ? (
                  <div className="mt-3">
                    <HoverHint
                      label={hardshipMeta[currentAdventure.peril].label}
                      description={hardshipMeta[currentAdventure.peril].description}
                    >
                      <div className="inline-flex items-center gap-1 rounded-full bg-cyan-950/50 px-2.5 py-1 text-xs text-cyan-100">
                        {hardshipMeta[currentAdventure.peril].icon}
                        {hardshipMeta[currentAdventure.peril].label}
                      </div>
                    </HoverHint>
                  </div>
                ) : null}
                {encounterKind !== "dragon" && hardshipInfo ? (
                  <div className="mt-3">
                    <HoverHint label={`Key Hazard: ${hardshipInfo.label}`} description={hardshipInfo.description}>
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                        {hardshipInfo.icon}
                        Key Hazard
                      </div>
                    </HoverHint>
                  </div>
                ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-4 md:grid-cols-4">
              <DropZone
                id="element"
                title="Element"
                description="Initiative and element"
                card={zones.element}
                returnToHandAction={returnToHandAction}
              />
              <DropZone
                id="action"
                title="Spell"
                description="Attack or move"
                card={zones.action}
                returnToHandAction={returnToHandAction}
              />
              <DropZone
                id="bonusAction"
                title="Boost"
                description="Add to action or init"
                card={zones.bonusAction}
                returnToHandAction={returnToHandAction}
              />
              <DropZone
                id="modifier"
                title="Merge"
                description="Reserve card forces upgrade"
                card={zones.modifier}
                returnToHandAction={returnToHandAction}
              />
            </div>
          </div>

          <div className="space-y-3">
            {(encounterKind === "enemy" || encounterKind === "dragon") && (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Boost Target</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onBoostTargetChange("action")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      boostTarget === "action" ? "bg-cyan-400 text-slate-950" : "bg-slate-950/70 text-slate-300"
                    }`}
                  >
                    Attack
                  </button>
                  <button
                    type="button"
                    onClick={() => onBoostTargetChange("initiative")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      boostTarget === "initiative" ? "bg-cyan-400 text-slate-950" : "bg-slate-950/70 text-slate-300"
                    }`}
                  >
                    Initiative
                  </button>
                </div>
                {encounterKind === "enemy" && currentEnemy?.ability === "ranged" && reserveCard ? (
                  <label className="mt-3 flex items-center gap-2 rounded-xl bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={useReserveAgainstRanged}
                      onChange={(event) => onUseReserveAgainstRangedChange(event.target.checked)}
                    />
                    Spend reserve in cleanup to ignore Ranged early damage
                  </label>
                ) : null}
              </div>
            )}

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Resolution</div>
              {finalActionSets.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {finalActionSets.map((actionSet, index) => (
                    <div key={actionSet.label} className="rounded-xl bg-slate-950/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-white">{actionSet.label}</div>
                        <button
                          type="button"
                          onClick={() => onEditActionSet(index)}
                          disabled={Boolean(resolution)}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-800/50 disabled:text-slate-500"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                          {actionSet.preview.actionType === "move" ? <Footprints className="h-3 w-3" /> : <Sword className="h-3 w-3" />}
                          {actionSet.preview.totalActionValue}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                          <Zap className="h-3 w-3" />
                          {actionSet.preview.totalInitiative}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {preview ? (
                <div className="mt-3 space-y-3 text-sm text-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-950/70 px-3 py-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        {preview.encounterKind === "adventure" ? <Footprints className="h-3.5 w-3.5" /> : <Sword className="h-3.5 w-3.5" />}
                        Value
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">{preview.totalActionValue}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-300">
                        <HoverHint
                          label={preview.actionType === "move" ? "Move value" : "Attack value"}
                          description={`${preview.actionType === "move" ? "Base move" : "Base attack"} before bonuses and reductions.`}
                        >
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                            {preview.actionType === "move" ? <Footprints className="h-3 w-3" /> : <Sword className="h-3 w-3" />}
                            {preview.actionBaseValue ?? preview.totalActionValue}
                          </span>
                        </HoverHint>
                        {(preview.actionBonusApplied ?? 0) > 0 ? (
                          <HoverHint
                            label="Bonus applied"
                            description="Boost and other positive modifiers added to the action."
                          >
                            <span className="rounded-full bg-emerald-950/50 px-2 py-0.5 text-emerald-200">
                              +{preview.actionBonusApplied}
                            </span>
                          </HoverHint>
                        ) : null}
                      </div>
                      {(preview.actionReductionTotal ?? 0) > 0 ? (
                        <div className="mt-1">
                          <HoverHint
                            label="Reductions"
                            description={(preview.actionReductionReasons ?? []).join(", ")}
                          >
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/50 px-2 py-0.5 text-xs text-rose-200">
                              <Shield className="h-3 w-3" />
                              -{preview.actionReductionTotal}
                            </span>
                          </HoverHint>
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-xl bg-slate-950/70 px-3 py-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Zap className="h-3.5 w-3.5" />
                        Initiative
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">{preview.totalInitiative}</div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-950/70 px-3 py-2">
                    <div className="text-sm font-medium capitalize text-white">{preview.outcome}</div>
                    <div className="mt-2 text-sm text-slate-300">{preview.summary}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {preview.damagePenalty > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-rose-950/60 px-2.5 py-1 text-xs text-rose-200">
                          <HeartCrack className="h-3.5 w-3.5" />
                          Damage {preview.damagePenalty}
                        </div>
                      ) : null}
                      {preview.timePenalty > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-950/60 px-2.5 py-1 text-xs text-amber-200">
                          <Clock3 className="h-3.5 w-3.5" />
                          Time {preview.timePenalty}
                        </div>
                      ) : null}
                      {preview.hardship ? (
                        <HoverHint
                          label={hardshipMeta[preview.hardship].label}
                          description={hardshipMeta[preview.hardship].description}
                        >
                          <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                            {hardshipMeta[preview.hardship].icon}
                            {hardshipMeta[preview.hardship].label}
                          </div>
                        </HoverHint>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">
                  Assign Element and Spell to preview the encounter.
                </div>
              )}

              <button
                type="button"
                onClick={onResolve}
                disabled={
                  (!preview && finalActionSets.length < 2) ||
                  campaign.phase === "complete" ||
                  Boolean(resolution)
                }
                className="mt-4 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {campaign.phase === "complete"
                  ? "Campaign Complete"
                  : campaign.phase === "dragon" && finalActionSets.length < 2
                    ? `Save ${finalActionSets.length === 0 ? "Action Set #1" : "Action Set #2"}`
                    : campaign.phase === "dragon" && dragonStage === "journey"
                      ? "Resolve Final Journey"
                      : campaign.phase === "dragon"
                        ? "Resolve Dragon"
                        : "Resolve Encounter"}
              </button>
            </div>

            {campaign.phase === "complete" ? (
              <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-950/30 p-4 text-sm text-emerald-200">
                {campaign.result === "victory"
                  ? "Pyrecoil is defeated. The four-region run is complete."
                  : "The run ended before the dragon could be defeated."}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {resolution ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[1.75rem] border border-white/10 bg-slate-900/95 p-5 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Aftermath Phase</div>
                <div className="mt-2 text-sm text-slate-300">
                  Resolve time loss and damage first. After that, spend XP on cards that were not downgraded this encounter.
                </div>
              </div>
              <button
                type="button"
                onClick={onUndoLastChange}
                disabled={resolution.history.length === 0}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-800/50 disabled:text-slate-500"
              >
                Undo Last Change
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Pill label="Earned XP" value={resolution.earnedXp} />
              <Pill label="Spendable XP" value={resolution.xpToSpend} />
              <Pill label="Damage Left" value={resolution.remainingDamage} />
            </div>

            {resolution.remainingTimePenalty > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-950/30 p-3">
                <div className="text-sm text-amber-200">
                  Time penalty: discard {resolution.remainingTimePenalty} top deck card(s) before upgrades.
                </div>
                <button
                  type="button"
                  onClick={onApplyTimePenalty}
                  className="mt-3 rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950"
                >
                  Apply Time Penalty
                </button>
              </div>
            ) : null}

            {needsDowngrades || canSpendUpgrades ? (
              <div className="mt-4 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                {resolutionCards.map((card) => {
                  const lastChange = resolution.history[resolution.history.length - 1];
                  const canUndoCard = lastChange?.cardId === card.id;
                  const cardStats = getCardLevelStats(card);

                  return (
                    <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/70 px-3 py-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{card.name}</div>
                        <div className="text-xs text-slate-400">
                          Level {card.level} | Upgrade cost {card.level} | Soak {cardStats.resistance.value}
                        </div>
                        {needsDowngrades ? <StatChangeStrip card={card} targetLevel={card.level - 1} label="Downgrade" /> : null}
                        {canSpendUpgrades ? <StatChangeStrip card={card} targetLevel={Math.min(4, card.level + 1)} label="Upgrade" /> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canSpendUpgrades ? (
                          <button
                            type="button"
                            onClick={() => onUpgradeCard(card.id)}
                            disabled={resolution.xpToSpend < card.level || resolution.downgradedCardIds.includes(card.id)}
                            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            Upgrade
                          </button>
                        ) : null}
                        {needsDowngrades ? (
                          <button
                            type="button"
                            onClick={() => onDowngradeCard(card.id)}
                            disabled={resolution.downgradedCardIds.includes(card.id)}
                            className="rounded-lg bg-rose-400 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            Downgrade
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={onUndoLastChange}
                          disabled={!canUndoCard}
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-800/60 disabled:text-slate-500"
                        >
                          Undo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                No more upgrades or downgrades are needed. You can finish the encounter.
              </div>
            )}

            <button
              type="button"
              onClick={onFinishResolution}
              disabled={resolution.remainingDamage > 0 || resolution.remainingTimePenalty > 0}
              className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Finish Encounter
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
