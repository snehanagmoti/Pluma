const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const getModel = () => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
};

async function testGenerateStory() {
  try {
    const model = getModel();
    if (!model) {
        console.log("No model!");
        return;
    }
    const systemPrompt = `You are an expert, professional novelist. The user wants you to write a complete story based on this prompt: "A cyberpunk detective".
    
    Constraints:
    - Total Chapters: Exactly 9
    - Language: English
    - Target Word Count Per Chapter: Approximately 500 words
    - Tone/Style: Creative
    
    Output Format:
    You MUST output ONLY a strictly valid JSON array of objects. Do NOT wrap the JSON in markdown code blocks (\`\`\`json). Do NOT add any preamble or postamble text.
    Format exactly like this:
    [
      {
        "title": "Chapter 1: Title Here",
        "content": "Full chapter content here... \n\n More paragraphs..."
      }
    ]
    `;

    console.log("Calling model...");
    const result = await model.generateContent(systemPrompt);
    let outputText = result.response.text();
    console.log("Raw output:", outputText);
    
    if (outputText.startsWith("\`\`\`json")) {
      outputText = outputText.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "");
    } else if (outputText.startsWith("\`\`\`")) {
      outputText = outputText.replace(/^\`\`\`/, "").replace(/\`\`\`$/, "");
    }
    
    const parsedData = JSON.parse(outputText.trim());
    console.log("Parsed:", parsedData);
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

testGenerateStory();
