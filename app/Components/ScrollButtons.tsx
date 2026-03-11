"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

export default function ScrollButtons() {
    const [showTop, setShowTop] = useState(false);
    const [showBottom, setShowBottom] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            setShowTop(window.scrollY > 300);
            setShowBottom(window.scrollY < document.body.scrollHeight - window.innerHeight - 300);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const scrollBottom = () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth"});
    };

    return (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {showTop && (
            <button onClick={scrollTop} className="p-3 opacity-75 rounded-full shadow-md bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
                <ArrowUp className="w-5 h-5" />
            </button>
        )}
        {showBottom && (
            <button onClick={scrollBottom} className="p-3 opacity-75 rounded-full shadow-md bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
                <ArrowDown className="w-5 h-5" />
            </button>)}
        </div>
    );
}