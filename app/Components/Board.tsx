"use client";

import { JSX } from "react";
import DropZone from "./DropZone";
import { Card } from "../Types/types";
import { Zap, Flame, Droplet, Mountain, Wind, Footprints, Sword, } from "lucide-react";


export default function Board({ zones, returnToHandAction }: {
    zones: {
        action: Card | null;
        element: Card | null;
        bonus: Card | null;
        modifier: Card | null;
    };
    returnToHandAction: (card: Card) => void;
}) {

    const elementIcons: Record<string, JSX.Element> = {
        fire: <Flame className="w-5 h-5" />,
        water: <Droplet className="w-5 h-5" />,
        earth: <Mountain className="w-5 h-5" />,
        wind: <Wind className="w-5 h-5" />,
    };
    const initiative = zones.element?.initiative ?? 0;
    const isActionUpgraded = Boolean((zones.action && zones.element && zones.element.element === zones.action.upgradeRequirement) || (zones.modifier?.upgradeRequirement && zones.action));
    const baseDamage = isActionUpgraded ? zones.action?.upgradedAction?.value ?? 0 : zones.action?.action.value ?? 0;
    const bonusDamage = zones.bonus?.bonus ?? 0;

    const totalDamage = baseDamage + bonusDamage;

    return (
        <>
            <div className="grid grid-cols-3 grid-rows-2 gap-6 mt-10 place-items-center bg-red-900/20 p-10 rounded-xl">

                <div>Deck Goes Here</div>
                <DropZone id="modifier" card={zones.modifier} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />
                <div> Enemy Placeholder</div>

                <DropZone id="element" card={zones.element} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />

                <DropZone id="action" card={zones.action} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />
                <DropZone id="bonus" card={zones.bonus} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />
            </div>
            <div className="grid grid-cols-3 grid-rows-1 gap-6 mt-10 place-items-center">

                <div> {<Zap className="inline w-5 h-5" />} {initiative}</div>
                <div> {elementIcons[zones.element?.element || '']} </div>
                <div>
                    {zones.action?.type === "move"
                        ? <Footprints className="inline w-5 h-5 m5-2" />
                        : <Sword className="inline w-5 h-5 mr-2" />}
                    {totalDamage} {bonusDamage > 0 ? <span className="text-green-500 ml-2"> + {bonusDamage}</span> : null}
                </div>
            </div>
        </>
    );
}