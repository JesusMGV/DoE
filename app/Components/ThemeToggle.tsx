"use client"

import { useState } from "react"

export default function ThemeToggle() {
    const [theme, setTheme] = useState<"Light" | "Dark">("Light")

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains("dark")
        document.documentElement.classList.toggle('dark');
        setTheme(isDark ? "Light" : "Dark")
    }

    return (
        <button
        onClick={toggleTheme}
        className="px-4 py-2 rounded border border-gray-400 bg-[var(--background)] text-[var(--foreground)]"
        >
        Switch to {theme === "Dark" ? "Light" : "Dark"} Mode
        </button>
    )
}
