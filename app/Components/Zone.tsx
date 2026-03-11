import { useDroppable } from "@dnd-kit/core";
import { Card } from "../Types/types";
import CardComponent from "./Card";

type Props = {
    id: string;
    label: string;
    card: Card | null;
};

export default function Zone({ id, label, card }: Props) {

    const { setNodeRef, isOver } = useDroppable({
        id
    });

    return (
        <div className="flex flex-col items-center gap-2">

        <div className="text-white text-sm">{label}</div>

        <div
            ref={setNodeRef}
            className={`w-40 h-56 border-2 rounded-xl flex items-center justify-center 
            ${isOver ? "border-green-400 bg-slate-700" : "border-slate-500 bg-slate-800"}`}
        >
            {card ? <CardComponent card={card} /> : "Drop"}
        </div>

        </div>
    );
}