const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testTranslation() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const prompt = "Translate 'Hello world' to Spanish.";
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
}
testTranslation();
