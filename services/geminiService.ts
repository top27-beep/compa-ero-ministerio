import { GoogleGenAI, Type } from "@google/genai";

// Initialize the API client
// NOTE: In a production environment, never expose API keys on the client side.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

const SYSTEM_INSTRUCTION_BASE = `
Eres un asistente útil y respetuoso para Testigos de Jehová.
Tu objetivo es ayudar en el ministerio del campo y la preparación de reuniones.
REGLA DE ORO: Toda la información doctrinal, consejos, explicaciones de textos bíblicos y presentaciones DEBE basarse estrictamente en el sitio web jw.org y la Biblia (Traducción del Nuevo Mundo).
No especules ni uses doctrinas de otras fuentes religiosas.
Sé amable, animador y práctico.
`;

/**
 * Generates presentations using Google Search Grounding to find current content on jw.org
 */
export const generatePresentations = async (topic: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Busca en jw.org sugerencias recientes para presentaciones o temas de conversación sobre: "${topic}". 
      Genera 3 opciones de presentaciones breves para el ministerio. 
      Incluye una pregunta inicial, un texto bíblico y una publicación o video sugerido.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Error generating presentation:", error);
    throw error;
  }
};

/**
 * Finds territory/places using Google Maps Grounding
 */
export const findPreachingLocations = async (query: string, location: { lat: number; lng: number }) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Encuentra lugares adecuados para predicar públicamente (predicación pública) cerca de mí, como parques tranquilos, plazas o paradas de transporte. ${query}`,
      config: {
        systemInstruction: "Eres un asistente de territorio. Sugiere lugares públicos seguros y transitados adecuados para poner un carrito de publicaciones o predicar informalmente.",
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

    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Error finding locations:", error);
    throw error;
  }
};

/**
 * Text Chat with reasoning (Pro model) and Search capabilities for Daily Text
 */
export const sendChatMessage = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  try {
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Inject dynamic date and specific instructions for daily text
    const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION_BASE}
    
    FECHA DE HOY: ${today}.
    
    INSTRUCCIONES IMPORTANTES:
    1. Si el usuario pide el "texto diario", "texto de hoy" o "examinando las escrituras", DEBES USAR LA HERRAMIENTA DE BÚSQUEDA (Google Search) para encontrar el texto específico para la fecha de hoy (${today}) en el sitio jw.org.
    2. Proporciona el texto bíblico y un resumen del comentario del día.
    3. Asegúrate de que la información corresponda exactamente a la fecha de hoy.
    `;

    const chat = ai.chats.create({
      model: "gemini-3-pro-preview",
      messages: history,
      config: {
        systemInstruction: dynamicSystemInstruction,
        tools: [{ googleSearch: {} }], // Enable search specifically for finding the daily text
      },
    });

    const response = await chat.sendMessage({ message: newMessage });
    
    return {
        text: response.text,
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
};
