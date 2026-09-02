const mongoose = require("mongoose");

const PlanningCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 300 },
  },
  { _id: false, timestamps: true }
);

const RelationshipSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    target: { type: String, required: true },
    label: { type: String, default: "acquaintances" },
    trust: { type: Number, min: 0, max: 10, default: 5 },
    affection: { type: Number, min: 0, max: 10, default: 5 },
    tension: { type: Number, min: 0, max: 10, default: 0 },
    evidence: { type: String, default: "" },
  },
  { _id: false }
);

const CanvasNodeSchema = new mongoose.Schema({
  id: { type: String, required: true, maxlength: 100 },
  position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  data: {
    label: { type: String, required: true, maxlength: 300 },
    content: { type: String, default: "", maxlength: 5000 },
    type: { type: String, enum: ["plot", "character", "location", "event", "idea", "ai"], default: "plot" },
  },
}, { _id: false });

const CanvasEdgeSchema = new mongoose.Schema({
  id: { type: String, required: true, maxlength: 100 },
  source: { type: String, required: true, maxlength: 100 },
  target: { type: String, required: true, maxlength: 100 },
  label: { type: String, default: "", maxlength: 300 },
}, { _id: false });

const BookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    desc: {
      type: String,
      maxlength: 5000,
      default: "",
    },
    genres: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    cover: {
      type: String,
      default: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
    },
    privacy: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    chapters: [
      {
        title: { type: String, required: true },
        content: { type: String, default: "" },
        summary: { type: String, default: "" }, // AI-generated chapter summary for RAG
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Story Bible / Lore Memory — used by RAG for context-aware AI writing
    storyContext: {
      characters: [
        {
          name: { type: String, required: true },
          description: { type: String, default: "" },
          traits: [{ type: String }],
          role: { type: String, default: "" }, // protagonist, antagonist, supporting
          relationships: [{ type: String }], // e.g., "Daughter of King Aldric"
        },
      ],
      locations: [
        {
          name: { type: String, required: true },
          description: { type: String, default: "" },
          sensoryDetails: { type: String, default: "" }, // sights, sounds, smells
          significance: { type: String, default: "" }, // why it matters to the plot
        },
      ],
      timeline: [
        {
          event: { type: String, required: true },
          when: { type: String, default: "" }, // "Year 1", "Chapter 3", "Day 5"
          characters: [{ type: String }], // characters involved
          chapter: { type: Number, default: 0 },
        },
      ],
      factions: [
        {
          name: { type: String, required: true },
          description: { type: String, default: "" },
          members: [{ type: String }], // character names
          goals: { type: String, default: "" },
        },
      ],
      snippets: [
        {
          label: { type: String, required: true }, // e.g., "Magic System"
          content: { type: String, default: "" },
          tags: [{ type: String }],
        },
      ],
      items: [
        {
          name: { type: String, required: true },
          description: { type: String, default: "" },
          owner: { type: String, default: "" },
          significance: { type: String, default: "" },
        },
      ],
      worldRules: [{ type: String }], // e.g., "Magic requires blood sacrifice"
      plotSummary: { type: String, default: "" }, // Running summary of the story so far
      tone: { type: String, default: "" }, // e.g., "Dark fantasy with dry humor"
      authorStyleGuide: { type: String, default: "" }, // Custom voice instructions
    },
    planningBoard: {
      ideas: { type: [PlanningCardSchema], default: [] },
      toDraft: { type: [PlanningCardSchema], default: [] },
      drafting: { type: [PlanningCardSchema], default: [] },
      editing: { type: [PlanningCardSchema], default: [] },
      done: { type: [PlanningCardSchema], default: [] },
    },
    relationshipMatrix: { type: [RelationshipSchema], default: [] },
    storyCanvas: {
      nodes: { type: [CanvasNodeSchema], default: [] },
      edges: { type: [CanvasEdgeSchema], default: [] },
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    year: {
      type: Number,
    },
    isbn: {
      type: String,
    },
    pages: {
      type: Number,
    },
    language: {
      type: String,
      default: "en",
    },
    likes: {
      type: Array,
      default: [],
    },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        username: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    views: {
      type: Number,
      default: 0,
    },
    addedByCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

BookSchema.index({ title: "text", desc: "text", genres: "text" });
BookSchema.index({ privacy: 1, status: 1, createdAt: -1 });
BookSchema.index({ userId: 1, updatedAt: -1 });
BookSchema.index({ views: -1, addedByCount: -1, createdAt: -1 });

module.exports = mongoose.model("Book", BookSchema);
