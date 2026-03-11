"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus } from "lucide-react";
import { GENRES } from "../constants/genres";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import SignupToAddFallback from "../AuthFallback/SignupToAddFallback";

export default function NewRecommendationForm() {

    const addRecommendation = useMutation(api.recommendations.addRecommendation);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const currentForm = e.currentTarget;
        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;
        const genre = formData.get("genre") as string;
        const blurb = formData.get("blurb") as string;
        const url = formData.get("url") as string;

        if (!title || !genre || !blurb) {
            alert("Please fill in all fields");
            return;
        }

        await addRecommendation({ title, genre, blurb, url });
        currentForm.reset();
    }

    return (
        <div className="mt-8 w-full max-w-2xl mx-auto mt-20 border rounded-lg p-6 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-sm hover:border-zinc-400 transition">
            <h2 className="text-2xl font-bold mb-4 mt-8">Add a New Recommendation</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Title</label>
                    <input
                        type="text"
                        name="title"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#6c47ff] focus:border-[#6c47ff] 
                        bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                    />
                </div>
                {/* <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Genre</label>
                    <input
                        type="text"
                        name="genre"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#6c47ff] focus:border-[#6c47ff]"
                    />
                </div> */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                        Genre
                    </label>

                    <select
                        name="genre"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#6c47ff] focus:border-[#6c47ff]
                        bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                    >
                        <option value="">Select a genre</option>

                        {GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                            {genre}
                        </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Blurb</label>
                    <textarea
                        name="blurb"
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#6c47ff] focus:border-[#6c47ff]
                        bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">URL</label>
                    <input
                        type="text"
                        name="url"
                        placeholder="Optional — leave empty to create an IMDb search link"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#6c47ff] focus:border-[#6c47ff]
                        bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                    />
                </div>
                <SignedIn>
                    <button type="submit" className="flex items-center gap-2
                        border border-slate-300
                        hover:bg-slate-100
                        dark:border-slate-600
                        dark:hover:bg-slate-700
                        font-medium text-sm
                        h-10 px-4
                        rounded-lg
                        transition
                        cursor-pointer">
                        <Plus className="w-4 h-4" />
                            Add Recommendation
                    </button>
                </SignedIn>
                <SignedOut>
                    <SignupToAddFallback />
                </SignedOut>
            </form>
        </div>
    );
}