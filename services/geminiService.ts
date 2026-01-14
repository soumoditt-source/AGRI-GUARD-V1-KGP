import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AGRICULTURAL_KNOWLEDGE_BASE } from "../constants";
import { Language } from "../types";

// --- Types ---
export type ChatMode = 'standard' | 'thinking' | 'search' | 'maps' | 'lite';

export interface GeminiResponse {
  text: string;
  grounding?: any; // For Search/Maps metadata
}

// --- Rate Limiter ---
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number, refillRatePerSecond: number) {
    this.tokens = capacity;
    this.capacity = capacity;
    this.refillRate = refillRatePerSecond / 1000;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.waitForToken();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

const limiter = new RateLimiter(5, 0.5);

// --- RAG Helper ---
function retrieveContext(query: string): string {
  const lowerQuery = query.toLowerCase();
  const relevantDocs = AGRICULTURAL_KNOWLEDGE_BASE.filter(doc => 
    doc.keywords.some(k => lowerQuery.includes(k))
  );
  if (relevantDocs.length === 0) return "";
  return `\n\nRELEVANT KNOWLEDGE BASE (Use if helpful):\n${relevantDocs.map(d => `- ${d.content}`).join('\n')}`;
}

// --- Main Query Function ---
export const queryGemini = async (
  prompt: string,
  mode: ChatMode = 'standard',
  location?: { lat: number, lng: number },
  language: Language = Language.ENGLISH
): Promise<GeminiResponse> => {
  await limiter.waitForToken();

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = retrieveContext(prompt);
  const langInstruction = `Please respond in ${language}.`;
  const systemInstruction = `You are AgriGuard, an expert Agronomist AI designed for the Kshitij 2026 Precision Farming Challenge.
  Your goal is to help farmers with practical, scientific, and sustainable advice.
  
  Key Principles:
  1. Integrated Pest Management (IPM): Always suggest companion planting and long-term prevention.
  2. Precision: Use provided location data to infer local weather risks.
  3. Sustainability: Prioritize organic solutions before chemical ones.
  
  ${langInstruction}`;
  
  const fullPrompt = `${prompt}${context}`;

  let model = 'gemini-3-pro-preview';
  let config: any = { systemInstruction };
  
  switch (mode) {
    case 'lite':
      model = 'gemini-2.5-flash-lite-latest';
      break;
    case 'thinking':
      model = 'gemini-3-pro-preview';
      config = {
        ...config,
        thinkingConfig: { thinkingBudget: 16000 }
      };
      break;
    case 'search':
      model = 'gemini-3-flash-preview';
      config = {
        ...config,
        tools: [{ googleSearch: {} }]
      };
      break;
    case 'maps':
      model = 'gemini-2.5-flash';
      config = {
        ...config,
        tools: [{ googleMaps: {} }],
        toolConfig: location ? {
          retrievalConfig: {
            latLng: {
              latitude: location.lat,
              longitude: location.lng
            }
          }
        } : undefined
      };
      break;
    case 'standard':
    default:
      model = 'gemini-3-flash-preview'; // Default to Flash for speed/cost, upgrade if needed
      break;
  }

  // Fallback Logic
  const attemptCall = async (modelName: string): Promise<any> => {
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config
      });
    } catch (error) {
       console.warn(`Model ${modelName} failed, trying fallback...`);
       throw error;
    }
  };

  try {
    const response = await attemptCall(model);
    return {
      text: response.text || "No response generated.",
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    // If Pro fails, try Flash
    if (model !== 'gemini-2.5-flash-lite-latest') {
       try {
         const fallbackResponse = await attemptCall('gemini-2.5-flash-lite-latest');
         return { text: fallbackResponse.text || "Fallback response.", grounding: undefined };
       } catch (e) {
         throw e; // Both failed
       }
    }
    throw error;
  }
};

// --- Image Analysis (Scanner) ---
export const analyzeCropImage = async (base64Image: string, language: Language) => {
  const prompt = `
    Analyze this crop image for pests, diseases, or nutrient deficiencies acting as an expert plant pathologist.
    Respond in ${language}.
    
    CRITICAL: You must identify the 'Lifecycle Stage' of the pest if present (e.g., Larva, Adult, Egg) to determine urgency.
    
    Return a STRICT JSON object.
    Format:
    {
      "detections": [
        {
          "id": "unique_id",
          "name": "Name in ${language}",
          "scientificName": "Scientific Name",
          "confidence": 0.0 to 1.0,
          "severity": "low" | "medium" | "high" | "critical",
          "bbox": [ymin, xmin, ymax, xmax] (scale 0-1000),
          "lifecycle": "Current stage (e.g., Larval Instar 3)",
          "treatment": {
            "organic": "Organic advice (e.g. Neem Oil)",
            "chemical": "Chemical advice (e.g. Emamectin Benzoate)",
            "prevention": "IPM Strategy (e.g., Companion planting with Marigolds, Trap crops)"
          }
        }
      ]
    }
    If healthy, return empty detections list.
  `;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{\"detections\": []}");
};

// --- Audio Transcription ---
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite-latest', // Fast transcription
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
        { text: "Transcribe this audio exactly." }
      ]
    }
  });
  return response.text || "";
};

// --- Live API Session ---
export const createLiveSession = async (callbacks: {
  onopen?: () => void,
  onmessage: (msg: LiveServerMessage) => void,
  onclose?: () => void,
  onerror?: (err: any) => void
}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: 'You are AgriGuard, an expert AI agronomist helping farmers. Focus on Integrated Pest Management, weather risks, and sustainable farming. Be concise, friendly, and helpful.'
    },
  });
};