import { query, mutation } from "./_generated/server";
import { v } from "convex/values"

export const get = query({
    args: {},
    handler: async (ctx) => {
    return await ctx.db.query("Recommendation").collect();
    },
});

export const getLimited = query({
    args: {
    limit: v.number(),
    },
    handler: async (ctx, args) => {
    return await ctx.db
        .query("Recommendation")
        .take(args.limit);
    },
});

export const deleteRecommendation = mutation({
    args: {
        id: v.id("Recommendation"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        const rec = await ctx.db.get(args.id);

        if (!rec) {
            throw new Error("Recommendation not found");
        }

        const isOwner = rec.userId === identity.subject;
        const isAdmin = identity.role === "admin";

        if (!isOwner && !isAdmin) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.id)
    }
})

export const toggleStaffPick = mutation({
    args: {
        id: v.id("Recommendation"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        if (identity.role !== "admin") {
            throw new Error("Only admins can toggle staff picks")
        }

        const recommendation = await ctx.db.get(args.id);

        if (!recommendation) {
            throw new Error("Recommendation not found");
        }

        await ctx.db.patch(args.id, {
            isStaffPick: !recommendation.isStaffPick
        })
    }
})

export const addRecommendation = mutation({
    args: {
        title: v.string(),
        genre: v.string(),
        blurb: v.string(),
        url: v.string(),
    },
    handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        // throw new Error("Unauthorized");
    }
    const claims = identity as {
        name?: string;
        email?: string;
    };

    const userName = claims?.name ?? claims?.email ?? "Anonymous";

    return await ctx.db.insert("Recommendation", {
        ...args,
        createdAt: Date.now(),
        userId: identity?.subject || "anon",
        isStaffPick: false,
        userName
    });
    },
});