import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const playbook = JSON.parse(
  await fs.readFile("./data/playbook.json", "utf8")
);

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const MODEL_STATE_PATH = "./model-state.json";

let activeModel = null;

async function loadPreferredModel() {
  try {
    const state = JSON.parse(
      await fs.readFile(MODEL_STATE_PATH, "utf8")
    );

    if (MODELS.includes(state.model)) {
      return state.model;
    }
  } catch {
    // No saved model yet.
  }

  return null;
}

async function savePreferredModel(model) {
  await fs.writeFile(
    MODEL_STATE_PATH,
    JSON.stringify({ model }, null, 2)
  );
}

async function generateWithFallback(request) {
  // 1. If this run already has a working model, reuse it.
  if (activeModel) {
    try {
      const response = await ai.models.generateContent({
        ...request,
        model: activeModel,
      });

      return response;
    } catch (error) {
      const status = error.status;

      if (
        status !== 429 &&
        status !== 500 &&
        status !== 502 &&
        status !== 503 &&
        status !== 504
      ) {
        throw error;
      }

      console.log(
        `${activeModel} failed: ${status}. Re-selecting model...`
      );

      activeModel = null;
    }
  }

  // 2. Try the model saved from a previous run.
  const preferredModel = await loadPreferredModel();

  if (preferredModel) {
    try {
      console.log(`Trying saved model ${preferredModel}...`);

      const response = await ai.models.generateContent({
        ...request,
        model: preferredModel,
      });

      activeModel = preferredModel;

      console.log(`Using ${activeModel} for this run.`);

      return response;
    } catch (error) {
      const status = error.status;

      if (
        status !== 429 &&
        status !== 500 &&
        status !== 502 &&
        status !== 503 &&
        status !== 504
      ) {
        throw error;
      }

      console.log(
        `Saved model ${preferredModel} failed: ${status}. Re-selecting model...`
      );
    }
  }

  // 3. Find a working model.
  for (const model of MODELS) {
    try {
      console.log(`Trying ${model}...`);

      const response = await ai.models.generateContent({
        ...request,
        model,
      });

      activeModel = model;

      await savePreferredModel(model);

      console.log(`Selected ${model} for this run.`);

      return response;
    } catch (error) {
      const status = error.status;

      console.log(
        `${model} failed: ${status || error.message}`
      );

      if (
        status !== 429 &&
        status !== 500 &&
        status !== 502 &&
        status !== 503 &&
        status !== 504
      ) {
        throw error;
      }
    }
  }

  throw new Error("All Gemini models are currently unavailable.");
}

export async function classifyLead(lead) {
  const prompt = `
Classify this inbound business lead.

Return ONLY JSON:
{
  "intent": "pricing_inquiry | partnership | support | general_inquiry | spam",
  "urgency": "high | medium | low"
}

Lead:
Name: ${lead.name}
Company: ${lead.company}
Message: ${lead.message}
`;

  const response = await generateWithFallback({
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: "low",
      },
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text);
}

export async function draftReply(lead, classification) {
  const prompt = `
You are the lead-response assistant for ${playbook.business_name}.

Business information:
${JSON.stringify(playbook, null, 2)}

Lead:
Name: ${lead.name}
Company: ${lead.company}
Email: ${lead.email}
Message: ${lead.message}

AI classification:
Intent: ${classification.intent}
Urgency: ${classification.urgency}

Write a concise, personalized email reply to this lead.

Rules:
- Follow the business playbook exactly.
- Only mention services, pricing, and case studies found in the playbook.
- Do not invent information.
- If the lead asks about pricing, you may mention the relevant pricing range from the playbook.
- Do not promise a final price before understanding the requirements.
- Personalize the response using the lead's company and message.
- Invite the prospect to a short discovery call.
- Keep the email professional, concise, helpful, and conversational.
- Do not include a subject line.
- Return only the email body.
`;

  const thinkingLevel = "low";

  const response = await generateWithFallback({
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel,
      },
    },
  });

  return response.text.trim();
}