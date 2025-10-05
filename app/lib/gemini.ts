import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface GeminiFeedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: Array<{ type: string; tip: string; explanation: string }>;
  };
  toneAndStyle: {
    score: number;
    tips: Array<{ type: string; tip: string; explanation: string }>;
  };
  content: {
    score: number;
    tips: Array<{ type: string; tip: string; explanation: string }>;
  };
  structure: {
    score: number;
    tips: Array<{ type: string; tip: string; explanation: string }>;
  };
  skills: {
    score: number;
    tips: Array<{ type: string; tip: string; explanation: string }>;
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

export async function analyzeResumeWithGemini(
  imageFile: File | string,
  instructions: string
): Promise<{ feedback: GeminiFeedback; rating: number } | null> {
  try {
    console.log('Starting Gemini analysis...');

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('Gemini API key is missing or empty');
      return null;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro', // Use pro for better accuracy
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Increased to prevent truncation
        topP: 0.95,
        topK: 40,
      },
    });

    let imageData: string;
    let mimeType: string;

    // Handle both File and URL inputs
    if (imageFile instanceof File) {
      const arrayBuffer = await imageFile.arrayBuffer();
      imageData = arrayBufferToBase64(arrayBuffer);
      mimeType = imageFile.type || 'image/png';
      console.log('Processing file:', imageFile.name, imageFile.type);
    } else if (typeof imageFile === 'string') {
      console.log('Fetching image from URL:', imageFile);
      const response = await fetch(imageFile, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      imageData = arrayBufferToBase64(arrayBuffer);
      mimeType = blob.type || 'image/png';
    } else {
      throw new Error('Invalid image input type');
    }

    console.log('Sending request to Gemini API...');

    const result = await model.generateContent([
      instructions,
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      },
    ]);

    const text = result.response.text();
    console.log('AI raw response received, length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));
    console.log('Last 200 chars:', text.substring(text.length - 200));

    // Clean the response
    let cleanedText = text.trim();

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/gi, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    // Extract JSON object
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No JSON braces found in AI response');
      console.error('Full response:', cleanedText);
      return null;
    }

    let jsonStr = cleanedText.substring(firstBrace, lastBrace + 1);

    // Check if JSON is complete
    const openBraces = (jsonStr.match(/{/g) || []).length;
    const closeBraces = (jsonStr.match(/}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/]/g) || []).length;

    console.log('JSON validation - Braces:', openBraces, 'vs', closeBraces, '| Brackets:', openBrackets, 'vs', closeBrackets);

    // Attempt to fix incomplete JSON
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.warn('Incomplete JSON detected, attempting to fix...');

      // Close unclosed brackets first
      for (let i = 0; i < (openBrackets - closeBrackets); i++) {
        jsonStr += '\n]';
      }

      // Close unclosed braces
      for (let i = 0; i < (openBraces - closeBraces); i++) {
        jsonStr += '\n}';
      }

      console.log('Fixed JSON, new length:', jsonStr.length);
    }

    try {
      const parsed = JSON.parse(jsonStr);
      console.log('Parsed JSON successfully');
      console.log('Overall Score:', parsed.overallScore);
      console.log('ATS Score:', parsed.ATS?.score);
      console.log('Tone & Style Score:', parsed.toneAndStyle?.score);
      console.log('Content Score:', parsed.content?.score);
      console.log('Structure Score:', parsed.structure?.score);
      console.log('Skills Score:', parsed.skills?.score);

      // Validate the structure
      if (!parsed.overallScore && !parsed.ATS && !parsed.toneAndStyle && !parsed.content) {
        console.error('Invalid feedback structure - missing all required fields');
        return null;
      }

      // Ensure all sections exist with default values
      const feedback: GeminiFeedback = {
        overallScore: parsed.overallScore || 50,
        ATS: parsed.ATS || { score: 50, tips: [] },
        toneAndStyle: parsed.toneAndStyle || { score: 50, tips: [] },
        content: parsed.content || { score: 50, tips: [] },
        structure: parsed.structure || { score: 50, tips: [] },
        skills: parsed.skills || { score: 50, tips: [] }
      };

      // Calculate rating
      let rating = feedback.overallScore;
      if (!rating || rating === 50) {
        const scores = [
          feedback.ATS?.score || 50,
          feedback.toneAndStyle?.score || 50,
          feedback.content?.score || 50,
          feedback.structure?.score || 50,
          feedback.skills?.score || 50
        ];
        rating = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }

      // Convert 0-100 score to 1-10 scale
      const scaledRating = Math.round(rating / 10);
      const finalRating = Math.min(10, Math.max(1, scaledRating));

      console.log('Final Rating (scaled to 1-10):', finalRating);

      return {
        feedback: feedback,
        rating: finalRating,
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse (first 1000 chars):', jsonStr.substring(0, 1000));
      console.error('Attempted to parse (last 500 chars):', jsonStr.substring(jsonStr.length - 500));

      // Return a default structure so the app doesn't crash
      console.warn('Returning default feedback structure due to parse error');
      return {
        feedback: {
          overallScore: 50,
          ATS: { score: 50, tips: [{ type: 'error', tip: 'Analysis incomplete', explanation: 'Please try again' }] },
          toneAndStyle: { score: 50, tips: [] },
          content: { score: 50, tips: [] },
          structure: { score: 50, tips: [] },
          skills: { score: 50, tips: [] }
        },
        rating: 5
      };
    }
  } catch (err) {
    console.error('Gemini analysis failed:', err);
    if (err instanceof Error) {
      console.error('Error details:', err.message, err.stack);
    }
    return null;
  }
}