import { PageSession } from '../types';

export interface AiAnalysisResult {
  summary: string;
  category: string;
}

/**
 * Helper to parse base64 image data from a Data URL string.
 */
function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches || matches.length < 3) return null;
  return {
    mimeType: matches[1] || 'image/jpeg',
    base64Data: matches[2] || ''
  };
}

/**
 * Formats milliseconds into a simple reading string.
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export class AiService {
  /**
   * Generates a summary and category for a completed page session.
   */
  public static async generateSummaryAndCategory(session: PageSession): Promise<AiAnalysisResult | null> {
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
      console.warn('[AiService] Gemini API key (VITE_GEMINI_API_KEY) is missing. Skipping AI analysis.');
      return null;
    }

    const prompt = `You are analyzing a user's web browsing session.

Session Metadata:
- Website: ${session.website}
- Page Title: ${session.title}
- Duration: ${formatDuration(session.duration)}
- Clicks: ${session.clickCount}
- Keystrokes: ${session.keystrokeCount}
- Max Scroll Depth: ${session.maxScrollDepth}%

Analyze the provided screenshot of the webpage along with the session metadata.
Generate a concise summary of what the user was doing on this page (their activity, goal, or focus).
Categorize the browsing session (e.g., Research, Development, Shopping, Social Media, Entertainment, Productivity, Reference).

You must return a JSON object with the keys "summary" and "category".`;

    const parts: any[] = [{ text: prompt }];

    if (session.screenshot) {
      const parsedImage = parseDataUrl(session.screenshot);
      if (parsedImage) {
        parts.push({
          inlineData: {
            mimeType: parsedImage.mimeType,
            data: parsedImage.base64Data
          }
        });
      }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              summary: { type: 'STRING' },
              category: { type: 'STRING' }
            },
            required: ['summary', 'category']
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned HTTP status ${response.status}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('Empty response from Gemini API candidates');
    }

    const parsedResult = JSON.parse(generatedText.trim());
    return {
      summary: parsedResult.summary || '',
      category: parsedResult.category || ''
    };
  }
}
