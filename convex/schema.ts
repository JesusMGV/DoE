import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    Recommendation: defineTable({
    title: v.string(),
    genre: v.string(),
    blurb: v.string(),
    createdAt: v.number(),
    userId: v.string(),
    userName: v.string(),
    url: v.string(),
    isStaffPick: v.boolean(),
    })
    .index("by_createdAt", ["createdAt"])
    .index("by_staffPick", ["isStaffPick"]),
});