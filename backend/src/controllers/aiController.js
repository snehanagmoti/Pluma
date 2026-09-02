// src/controllers/aiController.js
// Refactored to use LangChain for multi-model support (BYOK)
// while preserving all existing endpoints and adding new agentic features.

const { invoke, chainInvoke, resolveModel } = require("../utils/langchainService");
const { buildRAGContext, generateChapterSummary, extractCharacters, extractLocations } = require("../utils/storyContextRAG");
const { auditChapter, chatWithCharacter } = require("../agents/continuityAgent");
const User = require("../models/User");
const { encryptSecret, decryptKeyMap, decryptSecret } = require("../utils/secretVault");
const { PROVIDER_CONFIG } = require("../utils/langchainService");

// ─────────────────────────────────────────────────────────────
// Helper: resolve user's model preferences from the DB
// ─────────────────────────────────────────────────────────────
const getUserModelConfig = async (userId) => {
  if (!userId) return { userPrefs: {}, userApiKeys: {} };
  try {
    const user = await User.findById(userId).select("preferredModels +apiKeys.openai +apiKeys.anthropic +apiKeys.gemini").lean();
    if (!user) return { userPrefs: {}, userApiKeys: {} };
    return {
      userPrefs: user.preferredModels || {},
      userApiKeys: decryptKeyMap(user.apiKeys || {}),
    };
  } catch {
    return { userPrefs: {}, userApiKeys: {} };
  }
};

// Backward-compatible callAI helper (uses LangChain under the hood)
const callAI = async (prompt, options = {}) => {
  return invoke(prompt, { task: "draft", ...options });
};

const parseAIJson = result => {
  const cleaned = String(result || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");
  const start = objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart);
  if (start < 0) throw new Error("AI response did not contain JSON");
  const open = cleaned[start];
  const end = cleaned.lastIndexOf(open === "[" ? "]" : "}");
  if (end < start) throw new Error("AI response contained incomplete JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
};

// ═══════════════════════════════════════════════════════════════
// EXISTING ENDPOINTS (logic preserved, now uses LangChain)
// ═══════════════════════════════════════════════════════════════

const writeAssist = async (req, res) => {
  try {
    const { text, action, genre, tone, storyContext, chapters, currentChapterIdx } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });

    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const ragContext = buildRAGContext({
      storyContext: storyContext || {},
      chapters: chapters || [],
      currentChapterIdx: currentChapterIdx || 0,
      genre: genre || "fiction",
    });

    const ragBlock = ragContext ? `\n\n${ragContext}\n\n` : "";
    const t = tone ? `Tone: ${tone}.` : "";

    const prompts = {
      continue: `You are a creative writing assistant. ${ragBlock}Continue the following ${genre || "fiction"} story naturally. ${t} Write 2-3 paragraphs. Maintain consistency with the story context above. Only output the continuation:\n\n${text}`,
      improve: `You are an expert editor. ${ragBlock}Improve the following text. ${t} Make it more vivid and engaging. Only output the improved version:\n\n${text}`,
      grammar: `Fix all grammar and punctuation errors in the following text. Maintain original meaning. Only output corrected text:\n\n${text}`,
      summarize: `Summarize the following text concisely:\n\n${text}`,
      dialogue: `Extract the context from the following text and write a compelling dialogue exchange between the characters involved. ${ragBlock}${t} Only output the dialogue:\n\n${text}`,
      "describe-scene": `Take the following text and dramatically enhance the sensory descriptions of the setting/scene. ${ragBlock}${t} Only output the descriptive text:\n\n${text}`,
      "plot-twist": `Based on the following text, write a sudden, shocking plot twist that turns the story on its head. ${ragBlock}${t} Only output the twist:\n\n${text}`,
      "character-develop": `Analyze the character(s) in the following text and write a short paragraph revealing a deep, hidden motivation or flaw. ${ragBlock}${t} Only output the paragraph:\n\n${text}`,
    };

    const prompt = prompts[action] || prompts.improve;
    const result = await invoke(prompt, { task: "draft", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    console.error("AI write-assist error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

const brainstorm = async (req, res) => {
  try {
    const { genre, context } = req.body;
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const prompt = `You are a master storyteller. Brainstorm 3 highly creative and unique plot ideas for a ${genre || "fiction"} story. Context/Theme: ${context || "open world"}. Format as a bulleted list.`;
    const result = await invoke(prompt, { task: "brainstorm", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    res.status(500).json({ message: "AI service error" });
  }
};

const outline = async (req, res) => {
  try {
    const { text, genre } = req.body;
    if (!text) return res.status(400).json({ message: "Premise required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const prompt = `Create a chapter-by-chapter outline (5 chapters) for a ${genre || "fiction"} book based on this premise:\n\n${text}\n\nInclude a brief 1-sentence summary for each chapter.`;
    const result = await invoke(prompt, { task: "brainstorm", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    res.status(500).json({ message: "AI service error" });
  }
};

const toneShift = async (req, res) => {
  try {
    const { text, targetTone } = req.body;
    if (!text || !targetTone) return res.status(400).json({ message: "Text and targetTone required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const prompt = `Rewrite the following text so that the tone is explicitly ${targetTone}. Maintain the core events but change the style, vocabulary, and mood. Only output the rewritten text:\n\n${text}`;
    const result = await invoke(prompt, { task: "edit", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    res.status(500).json({ message: "AI service error" });
  }
};

const translate = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) return res.status(400).json({ message: "Required fields missing" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const prompt = `Translate to ${targetLanguage}. Only output translation:\n\n${text}`;
    const result = await invoke(prompt, { task: "edit", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    res.status(500).json({ message: "Translation error" });
  }
};

const generateDescription = async (req, res) => {
  try {
    const { title, genres, chapterContent } = req.body;
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const prompt = `Write a compelling book blurb (3-4 sentences) for a ${genres?.join(", ") || "fiction"} book titled "${title}". Sample:\n\n${chapterContent?.substring(0, 500) || "N/A"}\n\nOnly output description.`;
    const result = await invoke(prompt, { task: "summarize", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    res.status(500).json({ message: "AI service error" });
  }
};

const generateStory = async (req, res) => {
  try {
    const { prompt: userPrompt, chaptersCount, language, wordLimit, tone, includeMedia } = req.body;
    if (!userPrompt) return res.status(400).json({ message: "Prompt is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    let mediaInstruction = "";
    if (includeMedia) {
      mediaInstruction = `If you want to include an image at a key scene, output an HTML image tag using this exact format: <img src="https://image.pollinations.ai/prompt/Scene%20Description" alt="Scene Description" style="width:100%; border-radius:8px; margin: 20px 0;" />. Replace 'Scene%20Description' with a highly descriptive prompt for the image, URL-encoded. You can include up to one image per chapter.`;
    }

    const systemPrompt = `You are an expert, professional novelist. The user wants you to write a complete story based on this prompt: "${userPrompt}".
    
    Constraints:
    - Total Chapters: Exactly ${chaptersCount || 3}
    - Language: ${language || "English"}
    - Target Word Count Per Chapter: Approximately ${wordLimit || 500} words
    - Tone/Style: ${tone || "Creative and engaging"}
    ${mediaInstruction}
    
    Output Format:
    You MUST output ONLY a strictly valid JSON array of objects. Do NOT wrap the JSON in markdown code blocks (\`\`\`json). Do NOT add any preamble or postamble text.
    Format exactly like this:
    [
      {
        "title": "Chapter 1: Title Here",
        "content": "Full chapter content here... \\n\\n More paragraphs..."
      },
      ...
    ]
    `;

    let result = await invoke(systemPrompt, { task: "draft", userPrefs, userApiKeys });

    // Clean up potential markdown formatting
    if (result.startsWith("```json")) {
      result = result.replace(/^```json/, "").replace(/```$/, "");
    } else if (result.startsWith("```")) {
      result = result.replace(/^```/, "").replace(/```$/, "");
    }

    const parsedData = parseAIJson(result);
    if (!Array.isArray(parsedData) || parsedData.length === 0 || parsedData.length > 20) throw new Error("AI returned an invalid chapter list");
    res.status(200).json({ chapters: parsedData });
  } catch (err) {
    console.error("AI generate-story error:", err);
    res.status(500).json({ message: "Failed to generate story" });
  }
};

// ═══════════════════════════════════════════════════════════════
// AGENTIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const fleshItOut = async (req, res) => {
  try {
    const { text, genre, tone, storyContext, chapters, currentChapterIdx } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const ragContext = buildRAGContext({
      storyContext: storyContext || {},
      chapters: chapters || [],
      currentChapterIdx: currentChapterIdx || 0,
      genre: genre || "fiction",
    });

    const ragBlock = ragContext ? `\n\n${ragContext}\n\n` : "";

    const prompt = `You are an elite literary author specializing in transforming simple descriptions into breathtaking prose.
${ragBlock}
Transform the user's rough description into vivid, immersive writing:

1. **Show, Don't Tell**: Replace emotions with physical reactions and sensory details.
2. **Sensory Depth**: Include at least 3 senses.
3. **Emotional Resonance**: Convey emotion through action and environment.
4. **Pacing**: Short sentences for tension, long for atmosphere.
5. **Voice Consistency**: Match the tone "${tone || "literary fiction"}".

Keep the same events. Do NOT change WHAT happens — only HOW it is described. Write 2-4 paragraphs.

User's rough description:
"${text}"

Only output the fleshed-out prose:`;

    const result = await invoke(prompt, { task: "draft", userPrefs, userApiKeys });
    res.status(200).json({ result, source: "langchain" });
  } catch (err) {
    console.error("Flesh-it-out error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

const multiAgentWrite = async (req, res) => {
  try {
    const { text, genre, tone, storyContext, chapters, currentChapterIdx } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const ragContext = buildRAGContext({
      storyContext: storyContext || {},
      chapters: chapters || [],
      currentChapterIdx: currentChapterIdx || 0,
      genre: genre || "fiction",
    });
    const ragBlock = ragContext ? `\n\n${ragContext}\n\n` : "";
    const toneInstruction = tone ? `Tone: ${tone}.` : "";

    const results = await chainInvoke([
      {
        role: "beats",
        task: "brainstorm",
        prompt: `You are a story structure expert. Parse this raw input into clear "Story Beats".
${ragBlock}
Rules: Extract every event, action, emotional shift. Number sequentially. 1-2 sentences each.

User's raw input: "${text}"

Output beats:
Beat 1: ...`,
      },
      {
        role: "draft",
        task: "draft",
        prompt: (beats) => `You are a professional novelist writing a ${genre || "fiction"} story. ${toneInstruction}
${ragBlock}
Write immersive, publication-quality prose from these beats. 3-5 paragraphs. Use sensory details, dialogue, emotional depth.

Story Beats:
${beats}

Only output the prose:`,
      },
      {
        role: "final",
        task: "edit",
        prompt: (draft) => `You are a senior literary editor. Review and polish this draft.
${ragBlock}
Original intent: "${text}"

Draft:
${draft}

Checklist: faithful to intent, good pacing, no clichés, consistent with context, natural dialogue.

Output ONLY the final polished version:`,
      },
    ], { userPrefs, userApiKeys });

    res.status(200).json({
      beats: results.beats,
      draft: results.draft,
      final: results.final,
      source: "langchain",
    });
  } catch (err) {
    console.error("Multi-agent write error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

const generateVariations = async (req, res) => {
  try {
    const { text, genre, storyContext, chapters, currentChapterIdx } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const ragContext = buildRAGContext({
      storyContext: storyContext || {},
      chapters: chapters || [],
      currentChapterIdx: currentChapterIdx || 0,
      genre: genre || "fiction",
    });
    const ragBlock = ragContext ? `\n\n${ragContext}\n\n` : "";

    const prompt = `Generate exactly 3 DISTINCT scene variations from this idea. Each 2-3 paragraphs.
${ragBlock}
User's idea: "${text}"
Genre: ${genre || "fiction"}

**Variation 1 — ACTION-FOCUSED**: Fast-paced, kinetic prose.
**Variation 2 — EMOTION-FOCUSED**: Deep, introspective prose.
**Variation 3 — DIALOGUE-DRIVEN**: Story told through dialogue.

Output ONLY valid JSON array:
[{"style": "Action", "content": "..."}, {"style": "Emotion", "content": "..."}, {"style": "Dialogue", "content": "..."}]`;

    let result = await invoke(prompt, { task: "draft", userPrefs, userApiKeys });
    result = result.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const variations = parseAIJson(result);
    res.status(200).json({ variations, source: "langchain" });
  } catch (err) {
    console.error("Generate variations error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

const analyzeNarrative = async (req, res) => {
  try {
    const { chapters, storyContext, genre } = req.body;
    if (!chapters || chapters.length === 0) {
      return res.status(400).json({ message: "Chapters are required" });
    }
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const chapterSummaries = chapters.map((ch, i) => {
      const plain = (ch.content || "").replace(/<[^>]+>/g, "").substring(0, 800);
      return `Chapter ${i + 1} ("${ch.title}"): ${plain}`;
    }).join("\n\n---\n\n");

    const contextInfo = storyContext
      ? `\nStory tone: ${storyContext.tone || "not specified"}\nCharacters: ${(storyContext.characters || []).map(c => c.name).join(", ") || "not specified"}\n`
      : "";

    const prompt = `Analyze this ${genre || "fiction"} story and provide structured analysis.
${contextInfo}
Story chapters:
${chapterSummaries}

Output ONLY valid JSON:
{
  "overallScore": <1-10>,
  "pacing": {
    "assessment": "<1-2 sentence>",
    "chapterPacing": [{"chapter": 1, "tension": <1-10>, "label": "<Slow Build|Rising|Climax|Falling|Resolution>"}]
  },
  "characterArcs": [{"name": "<name>", "status": "<Developing|Static|Regressing|Resolved>", "note": "<1 sentence>"}],
  "strengths": ["<strength>"],
  "weaknesses": ["<weakness>"],
  "nextChapterSuggestion": "<2-3 sentences>"
}`;

    let result = await invoke(prompt, { task: "summarize", userPrefs, userApiKeys });
    result = result.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const analysis = parseAIJson(result);
    res.status(200).json({ analysis, source: "langchain" });
  } catch (err) {
    console.error("Analyze narrative error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

const summarizeChapter = async (req, res) => {
  try {
    const { chapterTitle, chapterContent } = req.body;
    if (!chapterContent) return res.status(400).json({ message: "Chapter content required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const callAIWrapped = (prompt) => invoke(prompt, { task: "summarize", userPrefs, userApiKeys });
    const summary = await generateChapterSummary(callAIWrapped, chapterTitle || "Untitled", chapterContent);
    res.status(200).json({ summary, source: "langchain" });
  } catch (err) {
    console.error("Summarize chapter error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

const extractStoryCharacters = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const callAIWrapped = (prompt) => invoke(prompt, { task: "summarize", userPrefs, userApiKeys });
    const characters = await extractCharacters(callAIWrapped, text);
    res.status(200).json({ characters, source: "langchain" });
  } catch (err) {
    console.error("Extract characters error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

// ═══════════════════════════════════════════════════════════════
// NEW ENDPOINTS — Pillar 3 & 4
// ═══════════════════════════════════════════════════════════════

// Continuity Audit Agent
const auditChapterEndpoint = async (req, res) => {
  try {
    const { storyContext, chapters, chapterIdx, genre } = req.body;
    if (!chapters || chapters.length === 0) {
      return res.status(400).json({ message: "Chapters are required" });
    }
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const result = await auditChapter({
      storyContext: storyContext || {},
      chapters,
      chapterIdx: chapterIdx || 0,
      genre: genre || "fiction",
      userPrefs,
      userApiKeys,
    });
    res.status(200).json({ audit: result, source: "langchain" });
  } catch (err) {
    console.error("Audit chapter error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

// Chat with Character
const chatWithCharacterEndpoint = async (req, res) => {
  try {
    const { characterName, userMessage, storyContext, chatHistory } = req.body;
    if (!characterName || !userMessage) {
      return res.status(400).json({ message: "characterName and userMessage are required" });
    }
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const response = await chatWithCharacter({
      characterName,
      userMessage,
      storyContext: storyContext || {},
      chatHistory: chatHistory || [],
      userPrefs,
      userApiKeys,
    });
    res.status(200).json({ response, source: "langchain" });
  } catch (err) {
    console.error("Chat with character error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

// Extract Locations
const extractStoryLocations = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const callAIWrapped = (prompt) => invoke(prompt, { task: "summarize", userPrefs, userApiKeys });
    const locations = await extractLocations(callAIWrapped, text);
    res.status(200).json({ locations, source: "langchain" });
  } catch (err) {
    console.error("Extract locations error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

// AI-powered canvas node generation
const generateCanvasNode = async (req, res) => {
  try {
    const { nodeType, context, connectedNodes, genre, storyContext } = req.body;
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);

    const connectedContext = (connectedNodes || [])
      .map((n) => `• ${n.type}: ${n.label} — ${n.data || ""}`)
      .join("\n");

    const prompt = `You are a story architect. Generate a new ${nodeType || "plot point"} node for a visual story canvas.

Genre: ${genre || "fiction"}
${context ? `Context: ${context}` : ""}
${connectedContext ? `Connected nodes:\n${connectedContext}` : ""}

Generate a JSON object for the new node:
{
  "label": "<short title, 3-5 words>",
  "content": "<1-2 sentence description>",
  "type": "${nodeType || "plot"}",
  "connections": "<suggestion of which existing nodes this should connect to>"
}

Output ONLY valid JSON:`;

    let result = await invoke(prompt, { task: "brainstorm", userPrefs, userApiKeys });
    result = result.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const node = parseAIJson(result);
    res.status(200).json({ node, source: "langchain" });
  } catch (err) {
    console.error("Canvas node generation error:", err);
    res.status(500).json({ message: "AI service temporarily unavailable" });
  }
};

// Generate two parallel "what if" chapter branches.
const branchChapter = async (req, res) => {
  try {
    const { text, divergence, genre, storyContext, chapters, currentChapterIdx } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Chapter text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);
    const ragContext = buildRAGContext({ storyContext, chapters, currentChapterIdx, genre });
    const prompt = `You are a story architect exploring a consequential fork in a narrative.
${ragContext}

Current chapter ending:
${text.replace(/<[^>]+>/g, "").slice(-2500)}

Divergence question: ${divergence || "What are two dramatically different choices the protagonist could make next?"}

Write two distinct continuations of 3-5 paragraphs each. Output ONLY valid JSON:
{"branches":[{"label":"Timeline A — concise choice","content":"...","consequences":["...","..."]},{"label":"Timeline B — concise choice","content":"...","consequences":["...","..."]}]}`;
    const result = await invoke(prompt, { task: "brainstorm", userPrefs, userApiKeys });
    res.status(200).json({ ...parseAIJson(result), source: "langchain" });
  } catch (error) {
    console.error("Branch chapter error:", error);
    res.status(500).json({ message: "Failed to create alternate timelines" });
  }
};

// Subjective feedback from distinct simulated reader personas.
const betaReadChapter = async (req, res) => {
  try {
    const { text, genre, storyContext } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Chapter text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);
    const characterNames = (storyContext?.characters || []).map(c => c.name).join(", ");
    const prompt = `Simulate three sharply different beta readers reviewing this ${genre || "fiction"} chapter.
Known characters: ${characterNames || "not specified"}

Chapter:
${text.replace(/<[^>]+>/g, "").slice(0, 6000)}

Output ONLY valid JSON:
{"readers":[
 {"persona":"The Action Junkie","verdict":"...","score":7,"loved":["..."],"concerns":["..."],"suggestion":"..."},
 {"persona":"The Romantic","verdict":"...","score":7,"loved":["..."],"concerns":["..."],"suggestion":"..."},
 {"persona":"The Nitpicker","verdict":"...","score":7,"loved":["..."],"concerns":["..."],"suggestion":"..."}
]}`;
    const result = await invoke(prompt, { task: "audit", userPrefs, userApiKeys });
    res.status(200).json({ ...parseAIJson(result), source: "langchain" });
  } catch (error) {
    console.error("Beta reader error:", error);
    res.status(500).json({ message: "Beta readers are temporarily unavailable" });
  }
};

// Track trust, affection, and tension between named characters.
const analyzeRelationships = async (req, res) => {
  try {
    const { chapters = [], storyContext = {} } = req.body;
    if ((storyContext.characters || []).length < 2) {
      return res.status(400).json({ message: "Add at least two Story Bible characters" });
    }
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);
    const content = chapters.map(ch => `${ch.title}: ${(ch.content || "").replace(/<[^>]+>/g, "").slice(0, 1800)}`).join("\n\n").slice(0, 7000);
    const characterContext = storyContext.characters.map(c => `${c.name}: ${c.description || ""}; traits: ${(c.traits || []).join(", ")}`).join("\n");
    const prompt = `Analyze the evolving relationships between these characters based only on the supplied story evidence.

Characters:
${characterContext}

Story:
${content}

Output ONLY valid JSON:
{"characters":["Name 1","Name 2"],"relationships":[{"source":"Name 1","target":"Name 2","label":"allies","trust":7,"affection":5,"tension":3,"evidence":"brief evidence"}]}
Use 0-10 integers. Include every meaningful pair, but never invent a character.`;
    const result = await invoke(prompt, { task: "audit", userPrefs, userApiKeys });
    res.status(200).json({ ...parseAIJson(result), source: "langchain" });
  } catch (error) {
    console.error("Relationship analysis error:", error);
    res.status(500).json({ message: "Failed to map relationships" });
  }
};

// Select an ambient focus soundscape and visual treatment for the scene.
const detectSoundscape = async (req, res) => {
  try {
    const { text, tone } = req.body;
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);
    const prompt = `Classify the ideal unobtrusive writing soundscape for this scene.
Tone: ${tone || "unspecified"}
Scene: ${(text || "").replace(/<[^>]+>/g, "").slice(-2200)}

Choose soundscape from: rain, forest, fireplace, ocean, city, space, silence.
Choose palette from: midnight, ember, moss, ocean, violet, paper.
Output ONLY valid JSON: {"soundscape":"rain","palette":"midnight","mood":"three-word mood","reason":"one concise sentence"}`;
    const result = await invoke(prompt, { task: "summarize", userPrefs, userApiKeys });
    res.status(200).json({ ...parseAIJson(result), source: "langchain" });
  } catch (error) {
    res.status(200).json({ soundscape: "rain", palette: "midnight", mood: "quiet creative focus", reason: "A neutral focus atmosphere was selected." });
  }
};

// Detect "telling" sentences and propose concrete sensory rewrites.
const showDontTell = async (req, res) => {
  try {
    const { text, genre } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Chapter text is required" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);
    const prompt = `Act as a surgical prose editor for ${genre || "fiction"}. Find up to 6 sentences that tell emotion, atmosphere, or character state instead of dramatizing it.

Text:
${text.replace(/<[^>]+>/g, "").slice(0, 6000)}

Output ONLY valid JSON:
{"findings":[{"original":"exact sentence from text","reason":"why it tells","rewrites":["creative rewrite one","creative rewrite two","creative rewrite three"]}]}
Return an empty findings array if the prose already shows effectively.`;
    const result = await invoke(prompt, { task: "edit", userPrefs, userApiKeys });
    res.status(200).json({ ...parseAIJson(result), source: "langchain" });
  } catch (error) {
    console.error("Show-dont-tell error:", error);
    res.status(500).json({ message: "Failed to analyze prose" });
  }
};

// Turn selected canvas ingredients into an executable scene draft.
const weaveScene = async (req, res) => {
  try {
    const { nodes = [], edges = [], genre, tone } = req.body;
    if (nodes.length < 2) return res.status(400).json({ message: "Connect at least two story nodes" });
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user?.id);
    const ingredients = nodes.map(node => `- ${node.type}: ${node.label} — ${node.content || ""}`).join("\n");
    const connections = edges.map(edge => `${edge.sourceLabel || edge.source} -> ${edge.targetLabel || edge.target}`).join("\n");
    const prompt = `Weave the supplied story-canvas ingredients into one cohesive 700-1000 word ${genre || "fiction"} scene.
Tone: ${tone || "cinematic and character-driven"}

Ingredients:
${ingredients}

Connections:
${connections || "Use the listed order and causal logic."}

Respect every supplied element. Start directly with polished prose; no title, notes, or markdown.`;
    const content = await invoke(prompt, { task: "draft", userPrefs, userApiKeys });
    res.status(200).json({ content, source: "langchain" });
  } catch (error) {
    console.error("Scene weave error:", error);
    res.status(500).json({ message: "Failed to weave scene" });
  }
};

// Save/Update AI Settings
const updateAiSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const { apiKeys, preferredModels, aiPreferences } = req.body;
    const update = {};
    const providers = Object.keys(PROVIDER_CONFIG);

    if (apiKeys && typeof apiKeys === "object") {
      for (const provider of providers) {
        if (!Object.prototype.hasOwnProperty.call(apiKeys, provider)) continue;
        const value = String(apiKeys[provider] || "").trim();
        if (value.startsWith("****")) continue;
        update[`apiKeys.${provider}`] = value ? encryptSecret(value.slice(0, 500)) : "";
      }
    }
    if (preferredModels && typeof preferredModels === "object") {
      const safeModels = {};
      for (const task of ["draft", "edit", "brainstorm", "summarize"]) {
        const provider = preferredModels[`${task}Provider`];
        const model = String(preferredModels[`${task}Model`] || "").trim();
        if (providers.includes(provider)) {
          safeModels[`${task}Provider`] = provider;
          safeModels[`${task}Model`] = model.slice(0, 100);
        }
      }
      update.preferredModels = safeModels;
    }
    if (aiPreferences && typeof aiPreferences === "object") {
      update.aiPreferences = {
        defaultTone: String(aiPreferences.defaultTone || "").slice(0, 200),
        styleGuide: String(aiPreferences.styleGuide || "").slice(0, 3000),
        autoFleshOut: Boolean(aiPreferences.autoFleshOut),
      };
    }

    await User.findByIdAndUpdate(userId, { $set: update }, { runValidators: true });
    res.status(200).json({ message: "AI settings updated successfully" });
  } catch (err) {
    console.error("Update AI settings error:", err);
    res.status(500).json({ message: "Failed to update settings" });
  }
};

// Get AI Settings
const getAiSettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(userId)
      .select("+apiKeys.openai +apiKeys.anthropic +apiKeys.gemini preferredModels aiPreferences")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    // Mask API keys for security (show only last 4 chars)
    const maskedKeys = {};
    if (user.apiKeys) {
      for (const [provider, key] of Object.entries(user.apiKeys)) {
        let plain = "";
        try { plain = decryptSecret(key); } catch (error) { plain = ""; }
        maskedKeys[provider] = plain ? `****${plain.slice(-4)}` : "";
      }
    }

    res.status(200).json({
      apiKeys: maskedKeys,
      preferredModels: user.preferredModels || {},
      aiPreferences: user.aiPreferences || {},
    });
  } catch (err) {
    console.error("Get AI settings error:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

const testAiSettings = async (req, res) => {
  try {
    const { userPrefs, userApiKeys } = await getUserModelConfig(req.user.id);
    const task = ["draft", "edit", "brainstorm", "summarize"].includes(req.body.task) ? req.body.task : "draft";
    const provider = userPrefs[`${task}Provider`] || "gemini";
    const model = userPrefs[`${task}Model`] || PROVIDER_CONFIG[provider]?.defaultModel;
    const result = await invoke("Reply with exactly: PLUMA_READY", { task, userPrefs, userApiKeys });
    res.status(200).json({ ready: /PLUMA_READY/i.test(result), provider, model: model || PROVIDER_CONFIG[provider]?.defaultModel });
  } catch (error) {
    res.status(422).json({ ready: false, message: error.message.includes("key") ? "The selected provider needs a valid API key." : "The selected AI model could not be reached." });
  }
};

module.exports = {
  // Existing endpoints
  writeAssist,
  brainstorm,
  outline,
  toneShift,
  translate,
  generateStory,
  generateDescription,
  // Agentic endpoints
  fleshItOut,
  multiAgentWrite,
  generateVariations,
  analyzeNarrative,
  summarizeChapter,
  extractStoryCharacters,
  // NEW endpoints
  auditChapterEndpoint,
  chatWithCharacterEndpoint,
  extractStoryLocations,
  generateCanvasNode,
  branchChapter,
  betaReadChapter,
  analyzeRelationships,
  detectSoundscape,
  showDontTell,
  weaveScene,
  updateAiSettings,
  getAiSettings,
  testAiSettings,
};
