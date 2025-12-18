import { GoogleGenAI } from "@google/genai";
import { GeoLocation } from "../types";

// We use a separate instance for Maps queries because the Live API 
// currently handles tools differently or we want to offload the grounding 
// to a specialized request that returns text for the Live model to read.

export const searchMaps = async (query: string, location: GeoLocation): Promise<string> => {
  try {
    // Instantiate inside the function to ensure process.env.API_KEY is available
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User Location: Latitude ${location.lat}, Longitude ${location.lng}. 
      Query: ${query}. 
      Provide a helpful summary of the places or directions found. 
      If providing directions, keep it simple.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.lat,
              longitude: location.lng
            }
          }
        }
      },
    });

    // We extract the text. The grounding metadata is useful for UI links, 
    // but here we primarily want the text to feed back to the Voice AI.
    const text = response.text || "Moiku kachu milo na (I couldn't find anything).";
    
    // Check for grounding chunks to log or return if needed for UI
    // const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    return text;
  } catch (error) {
    console.error("Map service error:", error);
    return "Are lalla, naksha khul na ryo (Map is not loading).";
  }
};