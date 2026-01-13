
import { GoogleGenAI, Type } from "@google/genai";
import { PhysicalResonance } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePhysicsWorld = async (base64Image: string): Promise<PhysicalResonance | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Analyze this drawing which acts as a physics simulation environment. Give a 'Physical Resonance' feedback. 'archetype' (e.g. The Funnel, The Cliff), 'complexity' (0-1), a poetic 'observation' about how the ball might behave, and a 'gravityTweak' multiplier (0.5 to 2.0) based on the mood of the drawing. Format as JSON." },
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image.split(',')[1]
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            archetype: { type: Type.STRING },
            complexity: { type: Type.NUMBER },
            observation: { type: Type.STRING },
            gravityTweak: { type: Type.NUMBER }
          },
          required: ["archetype", "complexity", "observation", "gravityTweak"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as PhysicalResonance;
    }
    return null;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
