
import { GoogleGenAI } from "@google/genai";
import { GeoLocation } from "../types";

export const searchMaps = async (query: string, location: GeoLocation): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User is at Lat ${location.lat}, Lng ${location.lng}. They asked: "${query}". 
      Respond like a Braj local providing quick directions or place info.`,
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

    return response.text || "Moiku kachu milo na, Bhaiya.";
  } catch (error) {
    console.error("Map service error:", error);
    return "Are lalla, naksha khul na ryo. Lag ryo hai internet marya gayo.";
  }
};
