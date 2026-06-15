import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // There isn't a direct list models method in the JS SDK currently, 
    // but we can test models to see which one works.
    const modelsToTest = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro"
    ];
    
    console.log("Testing available models for API key...");
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello");
        console.log(`✅ Model ${modelName} is AVAILABLE. Response: ${result.response.text()}`);
      } catch (err) {
        console.log(`❌ Model ${modelName} FAILED: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
