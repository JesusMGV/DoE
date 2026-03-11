export type Elemental = "fire" | "water" | "earth" | "air";

export type ActionType = "move" | "attack";

export interface Action {
    type: ActionType;
    value: number;
}

export interface Card {
    id: string;
    name: string;

    element: Elemental;
    initiative: number;
    bonus: number;

    action: Action;
    upgradedAction: Action;

    upgradeRequirement: string;

    resistance: {
        element: string
        value: number
    };
}