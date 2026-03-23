import { ZoneId } from "../../Types/types";

export const ZoneRules: Record<
    ZoneId,
    {
    type: "single" | "multi"
    exclusiveWith?: ZoneId
    }
> = {
    hand: { type: "multi" },
    deck: { type: "multi" },
    discard: { type: "multi" },

    action: { type: "single" },
    element: { type: "single" },
    modifier: { type: "single" },

    bonusAction: { type: "single", exclusiveWith: "bonusInit" },
    bonusInit: { type: "single", exclusiveWith: "bonusAction" }
}