// src/utils/langchainService.js
// Multi-model LLM factory using LangChain — supports Google Gemini, OpenAI, and Anthropic.
// Allows per-user model selection and BYOK (Bring Your Own Key).

const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

// Lazy-loaded providers (only require when a user actually needs them)
let ChatOpenAI, ChatAnthropic;

const PROVIDER_CONFIG = {
  gemini: {
    models: ["gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"],
    defaultModel: "gemini-3.5-flash-lite",
  },
  openai: {
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-sonnet-4-20250514",
  },
};

/**
 * Creates a LangChain chat model instance based on the provider and config.
 *
 * @param {Object} options
 * @param {string} options.provider - "gemini" | "openai" | "anthropic"
 * @param {string} [options.model] - Specific model name (optional, uses default)
 * @param {string} [options.apiKey] - User-provided API key (BYOK)
 * @param {number} [options.temperature] - Temperature (0-1)
 * @param {number} [options.maxTokens] - Max output tokens
 * @returns {import("@langchain/core/language_models/chat_models").BaseChatModel}
 */
function createModel({
  provider = "gemini",
  model,
  apiKey,
  temperature = 0.7,
  maxTokens = 4096,
} = {}) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const modelName = model || config.defaultModel;
  if (model && !/^[a-zA-Z0-9._:-]{2,100}$/.test(model)) {
    throw new Error("Invalid model identifier");
  }

  switch (provider) {
    case "gemini": {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key || key === "your_gemini_api_key_here") {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      return new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: key,
        temperature,
        maxOutputTokens: maxTokens,
      });
    }

    case "openai": {
      if (!ChatOpenAI) {
        ({ ChatOpenAI } = require("@langchain/openai"));
      }
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OpenAI API key is required (BYOK or env)");
      return new ChatOpenAI({
        model: modelName,
        apiKey: key,
        temperature,
        maxTokens,
      });
    }

    case "anthropic": {
      if (!ChatAnthropic) {
        ({ ChatAnthropic } = require("@langchain/anthropic"));
      }
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("Anthropic API key is required (BYOK or env)");
      return new ChatAnthropic({
        model: modelName,
        apiKey: key,
        temperature,
        maxTokens,
      });
    }

    default:
      throw new Error(`Provider ${provider} is not supported`);
  }
}

/**
 * Resolves the best model to use for a given task, considering user preferences
 * and falling back to defaults.
 *
 * @param {Object} options
 * @param {string} options.task - "draft" | "edit" | "brainstorm" | "summarize" | "audit"
 * @param {Object} [options.userPrefs] - User's preferred models from DB
 * @param {Object} [options.userApiKeys] - User's API keys from DB
 * @returns {import("@langchain/core/language_models/chat_models").BaseChatModel}
 */
function resolveModel({ task = "draft", userPrefs = {}, userApiKeys = {} } = {}) {
  // Check if user has a preferred provider/model for this task
  const taskKey = `${task}Provider`;
  const modelKey = `${task}Model`;

  const provider = userPrefs[taskKey] || "gemini";
  const requestedModel = userPrefs[modelKey];
  const retiredModels = new Set(["gemini-2.0-flash", "gemini-2.0-flash-lite"]);
  const model = retiredModels.has(requestedModel) ? PROVIDER_CONFIG[provider]?.defaultModel : (requestedModel || PROVIDER_CONFIG[provider]?.defaultModel);
  const apiKey = userApiKeys[provider] || undefined;

  try {
    return createModel({ provider, model, apiKey });
  } catch (err) {
    // Fallback to Gemini if user's preferred model fails
    if (provider !== "gemini") {
      console.warn(`Failed to create ${provider} model, falling back to Gemini:`, err.message);
      return createModel({ provider: "gemini" });
    }
    throw err;
  }
}

/**
 * Simple invoke helper — sends a prompt and returns the text response.
 * Replaces our old `callGemini` function but is provider-agnostic.
 *
 * @param {string} prompt - The prompt to send
 * @param {Object} [options] - Model resolution options
 * @returns {Promise<string>} The model's text response
 */
async function invoke(prompt, options = {}) {
  const model = options.model || resolveModel(options);
  try {
    const response = await model.invoke(prompt);
    return contentToText(response.content);
  } catch (error) {
    const task = options.task || "draft";
    const selectedProvider = options.userPrefs?.[`${task}Provider`] || "gemini";
    if (!options.model && selectedProvider !== "gemini" && (options.userApiKeys?.gemini || process.env.GEMINI_API_KEY)) {
      const fallback = createModel({ provider: "gemini", apiKey: options.userApiKeys?.gemini });
      const response = await fallback.invoke(prompt);
      return contentToText(response.content);
    }
    throw error;
  }
}

const contentToText = content => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => typeof part === "string" ? part : part?.text || "").join("");
  return String(content || "");
};

/**
 * Multi-step chain invoke — runs a sequence of prompts, piping context between them.
 * Used for the Writer's Room and other multi-agent workflows.
 *
 * @param {Array<{role: string, prompt: string|Function}>} steps
 * @param {Object} [options] - Model resolution options per step
 * @returns {Promise<Object>} Results keyed by role name
 */
async function chainInvoke(steps, options = {}) {
  const results = {};
  let previousOutput = "";

  for (const step of steps) {
    const prompt = typeof step.prompt === "function"
      ? step.prompt(previousOutput, results)
      : step.prompt;

    const taskOption = step.task || "draft";
    const text = await invoke(prompt, { ...options, task: taskOption });

    results[step.role] = text;
    previousOutput = text;
  }

  return results;
}

module.exports = {
  createModel,
  resolveModel,
  invoke,
  chainInvoke,
  PROVIDER_CONFIG,
};
