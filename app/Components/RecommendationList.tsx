"use client";
import React from 'react'
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignedIn, useUser } from "@clerk/nextjs"

import { GENRES } from "../constants/genres";
import { StaffPick } from './StaffPick';
import { ArrowRight, Trash2 } from "lucide-react";

export default function RecommendationList() {
    const [genreFilter, setGenreFilter] = React.useState<string>("all");
    const { user } = useUser();
    const isAdmin = user?.publicMetadata?.role === "admin";
    const recommendations = useQuery(api.recommendations.getLimited, { limit: 200 });
    const deleteRecommendation = useMutation(api.recommendations.deleteRecommendation);

    if (!recommendations) return <div>Loading...</div>;

const filteredRecommendations =
    genreFilter === "all"
        ? recommendations
        : genreFilter === "staff"
        ? recommendations.filter((rec) => rec.isStaffPick)
        : recommendations.filter((rec) => rec.genre === genreFilter);

    return (
        <div className="w-full">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold">Recommendations</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setGenreFilter("all")}
                        className={`px-3 py-1 text-sm rounded-full border transition
                            ${genreFilter === "all"
                            ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                            : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"}`}> All
                    </button>
                    <button onClick={() => setGenreFilter("staff")}
                        className={`px-3 py-1 text-sm rounded-full border transition
                            ${genreFilter === "staff"
                            ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                            : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"}`}> Staff Picks
                    </button>

                    {GENRES.map((genre) => (
                    <button key={genre} onClick={() => setGenreFilter(genre)}
                        className={`px-3 py-1 text-sm rounded-full border transition
                        ${genreFilter === genre
                            ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                            : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"}`}> {genre}
                    </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-h-[100px]">
                { filteredRecommendations.length === 0
                    ? (
                        <div className="col-span-full text-center pt-16 text-zinc-500 dark:text-zinc-400">
                            <p className="text-xl italic">
                                No recommendations found for &quot;{genreFilter}&quot;
                            </p>
                        </div>)
                    : (
                        filteredRecommendations.map((rec) => (
                            <article key={rec._id}
                                className={`group p-4 flex flex-col h-full rounded-tr-lg rounded-bl-lg border relative shadow-sm bg-white border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900
                                    dark:shadow-none transition hover:border-zinc-400 dark:hover:border-zinc-500
                                    ${rec.isStaffPick ? "border-l-4 border-l-amber-400 dark:border-l-amber-400" : ""}`}>
                                <header className="flex items-center justify-between mb-2">
                                    <StaffPick recId={rec._id} isStaffPick={rec.isStaffPick}/>

                                    {user?.id === rec.userId || isAdmin ? (
                                        <button onClick={() => deleteRecommendation({ id: rec._id })}
                                            className="group absolute top-0 right-0 flex items-center justify-center
                                                h-8 w-8 sm:h-12 sm:w-12
                                                rounded-tr-lg rounded-bl-lg
                                                bg-zinc-200 dark:bg-zinc-800
                                                text-zinc-600 dark:text-zinc-300
                                                hover:text-red-500 hover:bg-red-500/10
                                                md:opacity-0 md:group-hover:opacity-100
                                                transition">
                                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>) : null}
                                </header>

                                <h3 className="font-bold text-xl">{rec.title}</h3>

                                <section className="mt-1 space-y-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{rec.genre}</p>
                                    <p className="mt-4 line-clamp-5">{rec.blurb}</p>
                                </section>
                                <footer className="mt-auto flex justify-between items-center ">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                        <SignedIn>
                                            Added by {rec.userName}
                                            {user?.id === rec.userId && ( <span className='font-bold'>(You)</span>)}
                                        </SignedIn>
                                    </p>
                                            <a
                                                href={rec.url || `https://www.imdb.com/find/?q=${encodeURIComponent(rec.title)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-4 flex items-center text-indigo-500 hover:text-indigo-600 transition text-sm"
                                                title="Visit movie page"
                                            >
                                                Visit
                                                <ArrowRight className="ml-1 w-4 h-4" />
                                            </a>
                                </footer>
                            </article>
                        )))}
            </div>
        </div>
    )
}
