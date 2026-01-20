
import { GoogleGenAI } from "@google/genai";

export const analyzeResumePitch = async (name: string, pitch: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise brevemente o perfil do candidato ${name} baseado no seu texto de apresentação: "${pitch}". Destaque se ele parece motivado e qual o perfil comportamental dele em 2 frases curtas.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 150
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Não foi possível realizar a análise automática no momento.";
  }
};
