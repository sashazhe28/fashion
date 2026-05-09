import { GoogleGenAI, Type } from "@google/genai";
import posthog from "posthog-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const MODEL_NAME = "gemini-3-flash-preview";

export const ITEM_SCHEMA = {
  type: Type.ARRAY,
  description: "List of identified items in the image, up to 3.",
  items: {
    type: Type.OBJECT,
    properties: {
      itemDescription: { 
        type: Type.STRING, 
        description: "Short, concise Russian description of the item focusing only on visual features (e.g., 'Белая футболка оверсайз')." 
      },
      searchQuery: { 
        type: Type.STRING, 
        description: "The single most effective and precise Russian search query for this item (e.g., 'Белая хлопковая футболка оверсайз')." 
      }
    },
    required: ["itemDescription", "searchQuery"]
  }
};

export const ANALYSIS_SYSTEM_PROMPT = "You are a visual search expert for fashion marketplaces. Analyze the image and identify up to 3 distinct items. For each item, focus **only on visible attributes (Type of item, Main Color, and Key Style/Fit)**. Generate the single, shortest, and most effective Russian search query that accurately reflects the visual elements and will yield the highest relevance on search engines (e.g., 'Красный укороченный кардиган'). Do not guess brand or fabric. Prefer simplicity and high relevance. You MUST respond with a JSON array structure.";

const USER_PROMPT = "Identify the main clothing items and accessories in this photo and provide a precise search query for each.";

export async function analyzeFashionImage(base64Data: string) {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: USER_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: ITEM_SCHEMA,
        systemInstruction: ANALYSIS_SYSTEM_PROMPT
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const latency = (Date.now() - startTime) / 1000;

    posthog.capture("$ai_generation", {
      $ai_trace_id: traceId,
      $ai_model: MODEL_NAME,
      $ai_provider: "google",
      $ai_input: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      $ai_output_choices: [{ role: "assistant", content: response.text }],
      $ai_input_tokens: response.usageMetadata?.promptTokenCount ?? null,
      $ai_output_tokens: response.usageMetadata?.candidatesTokenCount ?? null,
      $ai_latency: latency,
    });

    return JSON.parse(response.text);
  } catch (e) {
    const latency = (Date.now() - startTime) / 1000;
    posthog.capture("$ai_generation", {
      $ai_trace_id: traceId,
      $ai_model: MODEL_NAME,
      $ai_provider: "google",
      $ai_input: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      $ai_latency: latency,
      $ai_is_error: true,
      $ai_error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
