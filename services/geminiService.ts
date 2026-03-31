
import { GoogleGenAI } from "@google/genai";

export async function* getMedicalAssistanceStream(prompt: string) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

    if (!apiKey) {
      console.error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to .env.local');
      yield 'API key not configured. Please contact your administrator.';
      return;
    }

    // console.log('Initializing Gemini AI with key:', apiKey.substring(0, 10) + '...');
    const genAI = new GoogleGenAI({ apiKey });

    // console.log('Generating content stream...');
    const resultStream = await genAI.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are PharmaCore Assistant, a highly specialized tool for pharmacists. 
Focus on: 
1. Drug-drug interaction safety.
2. Pediatric and geriatric dosage guidance.

Always use markdown formatting (headers with #, bold with **, bullet points with *) for clarity.
Include a mandatory professional disclaimer that this tool does not replace professional medical judgment or doctor consultation.

User Query: ${prompt}`
            }
          ]
        }
      ],
      config: {
        temperature: 0.5,
        maxOutputTokens: 2048,
      }
    });

    // console.log('Streaming response...');
    for await (const chunk of resultStream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
    // console.log('Stream completed successfully');
  } catch (error: any) {
    console.error("Gemini Streaming Error Details:", {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      stack: error?.stack,
      error: error
    });

    // Provide more specific error messages
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      yield "Invalid API key. Please check your Gemini API key configuration.";
    } else if (error?.message?.includes('quota') || error?.message?.includes('429')) {
      yield "API quota exceeded. Please try again later or check your Gemini API quota.";
    } else if (error?.message?.includes('model') || error?.message?.includes('404')) {
      yield "Model not available. Trying alternative model...";
      // Fallback to a different model
      try {
        const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
        const resultStream = await genAI.models.generateContentStream({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.5 }
        });
        for await (const chunk of resultStream) {
          const text = chunk.text;
          if (text) yield text;
        }
      } catch (fallbackError) {
        yield "Unable to connect to AI service. Please try again later.";
      }
    } else {
      yield `Error: ${error?.message || 'Unknown error occurred'}. Please check the console for details.`;
    }
  }
}
