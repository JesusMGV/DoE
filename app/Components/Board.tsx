"use client";

import { Footprints, Sword } from "lucide-react";
import DropZone from "./DropZone";
import { Card } from "../Types/types";


export default function Board({ zones, returnToHandAction }: {
    zones: {
        action: Card | null;
        element: Card | null;
        bonus: Card | null;
        modifier: Card | null;
    };
    returnToHandAction: (card: Card) => void;
}) {
    console.log(zones.element?.element === zones.action?.upgradeRequirement ? "Element matches upgrade requirement!" : "No match");

    const isActionUpgraded = zones.action && zones.element && zones.element.element === zones.action.upgradeRequirement;
    function returnToHand(card: Card) {
        // setHand((prev) => [...prev, card]);

        // setZones((prev) => {
        //     const updated = { ...prev };

        //     for (const zone in updated) {
        //         if (updated[zone]?.id === card.id) {
        //             updated[zone] = null;
        //         }
        //     }

        //     return updated;
        // });
        }
    return (
            <div className="grid grid-cols-3 grid-rows-2 gap-6 mt-10 place-items-center bg-red-900/20 p-10 rounded-xl">

                <div></div>
                <DropZone id="modifier" card={zones.modifier} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />
                <div></div>

                <DropZone id="element" card={zones.element} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />

                <DropZone id="action" card={zones.action} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />
                <DropZone id="bonus" card={zones.bonus} returnToHandAction={returnToHandAction} isUpgraded={isActionUpgraded} />

            </div>
    );
}