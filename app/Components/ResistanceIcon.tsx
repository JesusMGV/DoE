"use client";

import React, { JSX } from "react";
import { Shield } from "lucide-react";
import { Flame, Droplet, Mountain, Wind } from "lucide-react";

const elementFillClasses: Record<string, string> = {
  fire: "text-red-500 opacity-80",
  water: "text-blue-500 opacity-80",
  earth: "text-green-500 opacity-80",
  wind: "text-amber-400 opacity-80",
};

const elementIcons: Record<string, JSX.Element> = {
  fire: <Flame className="w-3 h-3 text-white" />,
  water: <Droplet className="w-3 h-3 text-white" />,
  earth: <Mountain className="w-3 h-3 text-white" />,
  wind: <Wind className="w-3 h-3 text-white" />,
};

export function ResistanceIcon({
  element,
  value,
}: {
  element: string;
  value: number;
}) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Shield filled with element color */}
      <Shield
        className={`w-full h-full ${elementFillClasses[element] ?? "text-gray-500"} fill-current stroke-black stroke-1`}
      />

      {/* Element icon inside */}
      <div className="absolute flex items-center justify-center opacity-20">
        {/* {elementIcons[element]} */}
      </div>

      {/* Resistance value on top */}
      <span className="absolute flex items-center justify-center text-lg font-bold text-white">
        {value}
      </span>
    </div>
  );
}