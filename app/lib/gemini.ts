// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');


export interface GeminiFeedback {
  rating: number;
  feedback: string;
}

export async function analyzeResumeWithGemini(
  imageUrl: string,
  instructions: string
): Promise<GeminiFeedback | null> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // <-- Use this ID for the best balance of speed and performance.
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
      });

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const prompt = `${instructions}

IMPORTANT: Respond ONLY in this JSON format:
{
  "rating": <number 1-10>,
  "feedback": "<detailed feedback>"
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: blob.type } }
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      rating: parsed.rating || 5,
      feedback: parsed.feedback || text
    };
  } catch (err) {
    console.error('Gemini analysis failed:', err);
    return null;
  }
}
