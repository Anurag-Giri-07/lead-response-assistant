import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const pager = await ai.models.list();

for await (const model of pager) {
  console.log(model.name);
}