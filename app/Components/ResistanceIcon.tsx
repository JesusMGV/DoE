"use client";

import { Shield } from "lucide-react";

const elementFillClasses: Record<string, string> = {
  fire: "text-red-500 opacity-80",
  water: "text-blue-500 opacity-80",
  earth: "text-green-500 opacity-80",
  wind: "text-amber-400 opacity-80",
};

export function ResistanceIcon({
  element,
  value,
}: {
  element: string | null;
  value: number;
}) {
  return (
    <div className="relative flex h-6 w-6 items-center justify-center">
      <Shield
        className={`w-full h-full ${elementFillClasses[element] ?? "text-gray-500"} fill-current stroke-black stroke-1`}
      />
      <span className="absolute flex items-center justify-center text-[10px] font-bold text-white">
        {value}
      </span>
    </div>
  );
}
