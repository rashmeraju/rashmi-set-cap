
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeminiResponseItem, SubtitleSegment, TaskType } from "../types";
import { parseTimeString } from "../utils/timeUtils";

const SHARED_FORMATTING_RULES = `
### CHARACTER & LINE LIMITS:
- **MAX 70 CHARACTERS TOTAL**: A segment must never exceed 70 characters (including spaces).
- **TWO-LINE MAX**: Subtitles must be 1 or 2 lines only.
- **MAX 35 CHARS PER LINE**: Each line must be ≤ 35 characters. If text > 35 chars, split into 2 lines using '\\n'.
- **LOGICAL SPLITTING**: Split lines at natural pauses or near prepositions (of, for, in, to, and) or punctuation.

### PRECISION SYNCHRONIZATION RULES (MANDATORY):
1. **VOICE-START ONSET**: The 'start' time MUST align perfectly with the very first audible syllable of the phrase. DO NOT include any leading silence.
2. **THE 1-SECOND SILENCE RULE**:
   - **GAPS < 1.0s**: If the silence between two phrases is less than 1 second, extend the 'end' time of the previous segment to touch the 'start' time of the next segment (seamless transition).
   - **GAPS > 1.0s**: If the silence is more than 1 second, set the 'end' time exactly when the voice finishes speaking. The screen should be blank during the long silence.
3. **NO OVERLAPS**: The 'end' of a segment must never be greater than the 'start' of the next.
4. **CONTINUITY**: Ensure every spoken word is captured and correctly synced within the total audio duration.
`;

const INSTRUCTION_TRANSLATE = `
You are "Rashmi TRANSLATE", the core engine of Rashmi SET.
OBJECTIVE: Transcribe Kannada audio and translate it into high-quality English subtitles with absolute timing precision.
${SHARED_FORMATTING_RULES}
`;

const INSTRUCTION_CAPTION = `
You are "CGN CAP", the specialized captioning engine of Rashmi SET.
OBJECTIVE: Generate verbatim English captions for English audio with frame-perfect synchronization.
${SHARED_FORMATTING_RULES}
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      start: { type: Type.STRING, description: "Start time (MM:SS.mmm) - must be exact voice onset" },
      end: { type: Type.STRING, description: "End time (MM:SS.mmm) - follows the 1s silence rule" },
      text: { type: Type.STRING, description: "Subtitle text (max 70 chars, max 2 lines, max 35 per line)" },
    },
    required: ["start", "end", "text"],
  },
};

function sanitizeAndRepairJson(text: string): string {
  let clean = text.trim();
  if (clean.includes('```')) {
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) clean = match[1].trim();
  }
  const firstBracket = clean.indexOf('[');
  if (firstBracket === -1) return "[]";
  const lastBracket = clean.lastIndexOf(']');
  if (lastBracket === -1 || lastBracket < firstBracket) {
    const lastValidClosingBrace = clean.lastIndexOf('}');
    if (lastValidClosingBrace !== -1 && lastValidClosingBrace > firstBracket) {
      clean = clean.substring(firstBracket, lastValidClosingBrace + 1) + ']';
    } else {
      return "[]";
    }
  } else {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }
  return clean;
}

export const generateSubtitles = async (
  audioBase64: string, 
  durationSeconds: number,
  mode: TaskType
): Promise<SubtitleSegment[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = mode === TaskType.TRANSLATE ? INSTRUCTION_TRANSLATE : INSTRUCTION_CAPTION;
  const taskDescription = mode === TaskType.TRANSLATE 
    ? `Translate Kannada to English.` 
    : `Caption English audio.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 32768 } 
      },
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "audio/wav", 
                data: audioBase64,
              },
            },
            {
              text: `${taskDescription} The audio is ${durationSeconds.toFixed(3)}s long. 
              STRICT REQUIREMENT: Voice-start must be exact. 
              If silence gap < 1s, previous segment ends at next segment start. 
              If silence gap > 1s, previous segment ends at voice offset. 
              MAX 35 CHARS PER LINE, MAX 70 CHARS TOTAL.`,
            },
          ],
        },
      ],
    });

    const rawText = response.text || "";
    if (!rawText) throw new Error("The AI model returned an empty response.");

    const jsonText = sanitizeAndRepairJson(rawText);
    
    try {
      const parsedItems: GeminiResponseItem[] = JSON.parse(jsonText);
      if (parsedItems.length === 0) throw new Error("No speech detected.");

      return parsedItems.map((item) => ({
        id: crypto.randomUUID(),
        startTime: parseTimeString(item.start),
        endTime: parseTimeString(item.end),
        text: item.text,
      }));
    } catch (parseError) {
      throw new Error("Failed to parse AI response. The file might be too complex or contain noise.");
    }
  } catch (error: any) {
    console.error("Rashmi SET Error:", error);
    throw error;
  }
};
