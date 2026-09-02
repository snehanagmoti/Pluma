// src/agents/continuityAgent.js
// Autonomous Continuity Agent — detects contradictions, dropped plot threads,
// and world-rule violations by comparing new chapter content against the Codex.
// Uses LangChain for provider-agnostic model invocation.

const { invoke } = require("../utils/langchainService");
const { buildRAGContext } = require("../utils/storyContextRAG");

/**
 * Audits a chapter for continuity issues against the story's Codex.
 *
 * @param {Object} options
 * @param {Object} options.storyContext - The book's full storyContext (Codex)
 * @param {Array}  options.chapters - All chapters in the book
 * @param {number} options.chapterIdx - Index of the chapter to audit
 * @param {string} options.genre - Primary genre
 * @param {Object} [options.userPrefs] - User's model preferences
 * @param {Object} [options.userApiKeys] - User's API keys
 * @returns {Promise<Object>} Audit results
 */
async function auditChapter({
  storyContext = {},
  chapters = [],
  chapterIdx = 0,
  genre = "fiction",
  userPrefs = {},
  userApiKeys = {},
}) {
  const chapter = chapters[chapterIdx];
  if (!chapter || !chapter.content) {
    return { issues: [], score: 10, summary: "No content to audit." };
  }

  const chapterText = chapter.content.replace(/<[^>]+>/g, "").substring(0, 5000);

  // Build the full RAG context so the agent knows ALL established lore
  const ragContext = buildRAGContext({
    storyContext,
    chapters,
    currentChapterIdx: chapterIdx,
    genre,
  });

  const prompt = `You are a meticulous continuity editor and story bible auditor. Your job is to find CONTRADICTIONS, INCONSISTENCIES, and DROPPED PLOT THREADS in the chapter below by comparing it against the established Story Context (Codex).

${ragContext}

--- CHAPTER TO AUDIT: "${chapter.title}" ---
${chapterText}
--- END CHAPTER ---

AUDIT CHECKLIST:
1. **Character Contradictions**: Does any character behave contrary to their established traits? Are physical descriptions consistent (eye color, age, abilities)?
2. **World Rule Violations**: Does anything in this chapter break the established world rules (e.g., using magic that was established as forbidden)?
3. **Timeline Conflicts**: Does the sequence of events conflict with the established timeline?
4. **Location Errors**: Are location descriptions consistent with established settings?
5. **Dropped Plot Threads**: Were any important plot elements from previous chapters ignored or contradicted?
6. **Character Voice Consistency**: Does each character's dialogue match their established personality and speech patterns?

Output ONLY a valid JSON object (no markdown formatting):
{
  "score": <1-10 integer, 10 = perfect continuity>,
  "summary": "<1-2 sentence overall assessment>",
  "issues": [
    {
      "type": "<contradiction|world_rule_violation|timeline_conflict|location_error|dropped_thread|voice_inconsistency>",
      "severity": "<critical|warning|suggestion>",
      "description": "<what the issue is>",
      "quote": "<the problematic text from the chapter>",
      "fix": "<suggested fix>"
    }
  ]
}

If there are no issues, return an empty issues array with score 10.`;

  try {
    let result = await invoke(prompt, {
      task: "audit",
      userPrefs,
      userApiKeys,
    });

    // Clean markdown wrapping
    result = result.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    return JSON.parse(result);
  } catch (err) {
    console.error("Continuity audit failed:", err);
    return {
      issues: [],
      score: 0,
      summary: "Audit failed — AI service unavailable.",
    };
  }
}

/**
 * Chat-with-character endpoint — the AI adopts a character's persona
 * based on their Codex entry and responds in-character.
 *
 * @param {Object} options
 * @param {string} options.characterName - Name of the character to "interview"
 * @param {string} options.userMessage - The author's message/question
 * @param {Object} options.storyContext - Full story context for persona building
 * @param {Object} [options.userPrefs] - User's model preferences
 * @param {Object} [options.userApiKeys] - User's API keys
 * @returns {Promise<string>} The character's response
 */
async function chatWithCharacter({
  characterName,
  userMessage,
  storyContext = {},
  chatHistory = [],
  userPrefs = {},
  userApiKeys = {},
}) {
  const character = (storyContext.characters || []).find(
    (c) => c.name.toLowerCase() === characterName.toLowerCase()
  );

  if (!character) {
    return `I couldn't find a character named "${characterName}" in your Story Bible. Please add them first.`;
  }

  // Build the character persona prompt
  const traits = character.traits?.join(", ") || "not specified";
  const relationships = character.relationships?.join("; ") || "none specified";
  const worldRules = (storyContext.worldRules || []).map((r) => `• ${r}`).join("\n");
  const tone = storyContext.tone || "neutral";

  const historyBlock = chatHistory.length > 0
    ? "\n\nPrevious conversation:\n" +
      chatHistory
        .slice(-6) // Keep last 6 messages for context
        .map((m) => `${m.role === "user" ? "Author" : character.name}: ${m.content}`)
        .join("\n")
    : "";

  const prompt = `You are ${character.name}, a character in a ${tone} story.

YOUR IDENTITY:
- Name: ${character.name}
- Role: ${character.role || "character"}
- Description: ${character.description || "not specified"}
- Personality Traits: ${traits}
- Relationships: ${relationships}

WORLD CONTEXT:
${worldRules ? `World Rules:\n${worldRules}` : "No specific world rules."}
Story Tone: ${tone}

RULES:
1. Stay COMPLETELY in character. Respond as ${character.name} would.
2. Use speech patterns, vocabulary, and mannerisms consistent with your traits.
3. Reference your relationships and backstory naturally.
4. If asked about things outside your knowledge, respond as the character would — they don't know they're fictional.
5. Keep responses concise (2-4 sentences) unless the author asks for more detail.
6. Show emotion and personality in every response.
${historyBlock}

Author asks: "${userMessage}"

Respond as ${character.name}:`;

  try {
    return await invoke(prompt, {
      task: "draft",
      userPrefs,
      userApiKeys,
    });
  } catch (err) {
    console.error("Character chat failed:", err);
    return "The character seems to be lost in thought... (AI service temporarily unavailable)";
  }
}

module.exports = { auditChapter, chatWithCharacter };
