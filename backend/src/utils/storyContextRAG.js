// src/utils/storyContextRAG.js
// Retrieval-Augmented Generation (RAG) utility for story writing.
// Retrieves relevant story context (characters, locations, world rules, timeline,
// factions, snippets, items, plot summary, chapter summaries) from the Book document
// and assembles it into a context block injected into every AI prompt.

/**
 * Builds a RAG context string from the book's storyContext and chapter summaries.
 * This is injected into AI prompts so the model "remembers" the full story state.
 */
function buildRAGContext({
  storyContext = {},
  chapters = [],
  currentChapterIdx = 0,
  genre = "fiction",
  title = "",
  userStyleGuide = "",
}) {
  const sections = [];

  // --- Book identity ---
  if (title) {
    sections.push(`[BOOK TITLE]: "${title}" (Genre: ${genre})`);
  }

  // --- Author style guide ---
  const styleGuide = storyContext.authorStyleGuide || userStyleGuide;
  if (styleGuide) {
    sections.push(`[AUTHOR STYLE GUIDE]: ${styleGuide}`);
  }

  // --- Tone ---
  if (storyContext.tone) {
    sections.push(`[NARRATIVE TONE]: ${storyContext.tone}`);
  }

  // --- Characters ---
  if (storyContext.characters && storyContext.characters.length > 0) {
    const charDescriptions = storyContext.characters.map((c) => {
      let desc = `• ${c.name}`;
      if (c.role) desc += ` [${c.role}]`;
      if (c.description) desc += `: ${c.description}`;
      if (c.traits && c.traits.length > 0) desc += ` (Traits: ${c.traits.join(", ")})`;
      if (c.relationships && c.relationships.length > 0) desc += ` | Relationships: ${c.relationships.join("; ")}`;
      return desc;
    });
    sections.push(`[CHARACTERS]:\n${charDescriptions.join("\n")}`);
  }

  // --- Locations ---
  if (storyContext.locations && storyContext.locations.length > 0) {
    const locDescriptions = storyContext.locations.map((l) => {
      let desc = `• ${l.name}`;
      if (l.description) desc += `: ${l.description}`;
      if (l.sensoryDetails) desc += ` | Sensory: ${l.sensoryDetails}`;
      if (l.significance) desc += ` | Significance: ${l.significance}`;
      return desc;
    });
    sections.push(`[LOCATIONS]:\n${locDescriptions.join("\n")}`);
  }

  // --- Factions ---
  if (storyContext.factions && storyContext.factions.length > 0) {
    const factionDescriptions = storyContext.factions.map((f) => {
      let desc = `• ${f.name}`;
      if (f.description) desc += `: ${f.description}`;
      if (f.goals) desc += ` | Goals: ${f.goals}`;
      if (f.members && f.members.length > 0) desc += ` | Members: ${f.members.join(", ")}`;
      return desc;
    });
    sections.push(`[FACTIONS/GROUPS]:\n${factionDescriptions.join("\n")}`);
  }

  // --- Items ---
  if (storyContext.items && storyContext.items.length > 0) {
    const itemDescriptions = storyContext.items.map((item) => {
      let desc = `• ${item.name}`;
      if (item.description) desc += `: ${item.description}`;
      if (item.owner) desc += ` | Owner: ${item.owner}`;
      if (item.significance) desc += ` | Significance: ${item.significance}`;
      return desc;
    });
    sections.push(`[IMPORTANT ITEMS/ARTIFACTS]:\n${itemDescriptions.join("\n")}`);
  }

  // --- Lore Snippets ---
  if (storyContext.snippets && storyContext.snippets.length > 0) {
    const snippetDescriptions = storyContext.snippets.map((s) => {
      let desc = `• [${s.label}]: ${s.content}`;
      if (s.tags && s.tags.length > 0) desc += ` (Tags: ${s.tags.join(", ")})`;
      return desc;
    });
    sections.push(`[LORE SNIPPETS]:\n${snippetDescriptions.join("\n")}`);
  }

  // --- World rules ---
  if (storyContext.worldRules && storyContext.worldRules.length > 0) {
    const rules = storyContext.worldRules.map((r) => `• ${r}`).join("\n");
    sections.push(`[WORLD RULES]:\n${rules}`);
  }

  // --- Timeline ---
  if (storyContext.timeline && storyContext.timeline.length > 0) {
    const events = storyContext.timeline.map((t) => {
      let desc = `• ${t.event}`;
      if (t.when) desc += ` (${t.when})`;
      if (t.characters && t.characters.length > 0) desc += ` — involving: ${t.characters.join(", ")}`;
      return desc;
    });
    sections.push(`[TIMELINE]:\n${events.join("\n")}`);
  }

  // --- Plot summary ---
  if (storyContext.plotSummary) {
    sections.push(`[PLOT SUMMARY SO FAR]: ${storyContext.plotSummary}`);
  }

  // --- Previous chapter summaries (the core RAG retrieval) ---
  const previousChapters = chapters.slice(0, currentChapterIdx);
  if (previousChapters.length > 0) {
    const summaries = previousChapters
      .map((ch, i) => {
        if (ch.summary) {
          return `Chapter ${i + 1} ("${ch.title}"): ${ch.summary}`;
        }
        const truncated = (ch.content || "").replace(/<[^>]+>/g, "").substring(0, 300);
        return `Chapter ${i + 1} ("${ch.title}"): ${truncated}...`;
      })
      .join("\n");
    sections.push(`[PREVIOUS CHAPTER SUMMARIES]:\n${summaries}`);

    // Include tail of the immediately preceding chapter for prose continuity
    const prevChapter = previousChapters[previousChapters.length - 1];
    if (prevChapter && prevChapter.content) {
      const tail = prevChapter.content.replace(/<[^>]+>/g, "").slice(-500);
      sections.push(`[END OF PREVIOUS CHAPTER (for prose continuity)]:\n...${tail}`);
    }
  }

  // --- Current chapter context ---
  const currentChapter = chapters[currentChapterIdx];
  if (currentChapter && currentChapter.content) {
    const currentText = currentChapter.content.replace(/<[^>]+>/g, "").slice(-1500);
    sections.push(`[CURRENT CHAPTER CONTENT SO FAR ("${currentChapter.title}")]:\n...${currentText}`);
  }

  if (sections.length === 0) {
    return "";
  }

  return (
    "=== STORY CONTEXT (Retrieved via RAG — use this to maintain consistency) ===\n\n" +
    sections.join("\n\n") +
    "\n\n=== END STORY CONTEXT ==="
  );
}

/**
 * Generates a chapter summary using the AI model.
 */
async function generateChapterSummary(callAI, chapterTitle, chapterContent) {
  if (!chapterContent || chapterContent.replace(/<[^>]+>/g, "").trim().length < 50) {
    return "";
  }

  const plainText = chapterContent.replace(/<[^>]+>/g, "").substring(0, 3000);
  const prompt = `Summarize the following chapter in exactly 2-3 sentences. Focus on key plot events, character developments, and any world-building reveals. Only output the summary.\n\nChapter: "${chapterTitle}"\n\n${plainText}`;

  try {
    return await callAI(prompt);
  } catch (err) {
    return "";
  }
}

/**
 * Extracts characters mentioned in a text block using AI.
 */
async function extractCharacters(callAI, text) {
  if (!text || text.replace(/<[^>]+>/g, "").trim().length < 100) {
    return [];
  }

  const plainText = text.replace(/<[^>]+>/g, "").substring(0, 3000);
  const prompt = `Analyze the following story text and extract all named characters. For each character, provide their name, a 1-sentence description based on what is revealed, 2-3 personality traits, their role (protagonist/antagonist/supporting), and any relationships mentioned.

Output ONLY a valid JSON array, no markdown formatting:
[{"name": "...", "description": "...", "traits": ["...", "..."], "role": "...", "relationships": ["..."]}]

Text:
${plainText}`;

  try {
    let result = await callAI(prompt);
    result = result.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    return JSON.parse(result);
  } catch (err) {
    return [];
  }
}

/**
 * Extracts locations from a text block using AI.
 */
async function extractLocations(callAI, text) {
  if (!text || text.replace(/<[^>]+>/g, "").trim().length < 100) {
    return [];
  }

  const plainText = text.replace(/<[^>]+>/g, "").substring(0, 3000);
  const prompt = `Analyze the following story text and extract all named locations or settings. For each location, provide its name, a brief description, sensory details, and its significance to the plot.

Output ONLY a valid JSON array, no markdown formatting:
[{"name": "...", "description": "...", "sensoryDetails": "...", "significance": "..."}]

Text:
${plainText}`;

  try {
    let result = await callAI(prompt);
    result = result.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    return JSON.parse(result);
  } catch (err) {
    return [];
  }
}

module.exports = { buildRAGContext, generateChapterSummary, extractCharacters, extractLocations };
