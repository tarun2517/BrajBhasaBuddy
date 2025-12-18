import { GoogleGenAI } from "@google/genai";
import { GeoLocation, MapSearchResult } from "../types";

export const searchMaps = async (query: string, location: GeoLocation): Promise<MapSearchResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User is at Lat ${location.lat}, Lng ${location.lng}. They asked: "${query}". 
      Respond like a Braj local guide who is funny and helpful.`,
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

    const links: { uri: string; title: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          links.push({
            uri: chunk.maps.uri,
            title: chunk.maps.title || "See on Maps"
          });
        }
      });
    }

    return {
      text: response.text || "Moiku kachu milo na, Bhaiya.",
      links: links
    };
  } catch (error: any) {
    console.error("Map service error:", error);
    if (error.message?.includes("Requested entity was not found")) {
        throw error; // Let the caller handle the API key re-selection
    }
    return {
      text: "Are lalla, naksha khul na ryo. Lag ryo hai internet marya gayo.",
      links: []
    };
  }
};