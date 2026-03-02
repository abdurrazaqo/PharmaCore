
import { GoogleGenAI } from "@google/genai";

export async function* getMedicalAssistanceStream(prompt: string) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    
    if (!apiKey) {
      console.error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to .env.local');
      yield 'API key not configured. Please contact your administrator.';
      return;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are PharmaCore Assistant, a highly specialized tool for pharmacists. 
        Focus on: 
        1. Drug-drug interaction safety.
        2. Pediatric and geriatric dosage guidance.
        3. Stock management advice for medical inventories.
        
        Always use bullet points for clarity and include a mandatory professional disclaimer that this tool does not replace professional medical judgment or doctor consultation.`,
        temperature: 0.5,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    yield "I encountered an error while processing your request. Please ensure your query is valid and try again.";
  }
}
