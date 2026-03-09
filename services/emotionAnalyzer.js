const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Analyze facial expressions in video frames using Gemini 2.0 Flash.
 * Accepts raw mp4 — no ffmpeg needed.
 */
async function analyzeVideoEmotions(videoPath) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const videoBytes = fs.readFileSync(videoPath);
  const base64Video = videoBytes.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'video/mp4',
              data: base64Video,
            },
          },
          {
            text: `Analyze the facial expressions and body language of the person(s) in this video.
Return a JSON array of emotion segments with this exact structure:
[{"start_time": 0, "end_time": 5, "emotion": "happy", "confidence": 0.9, "description": "Person is smiling broadly"}]

Rules:
- start_time and end_time are in seconds (integers)
- emotion must be one of: happy, sad, angry, surprised, disgusted, fearful, neutral, excited, confused
- confidence is 0.0 to 1.0
- description is a brief explanation of what you observe
- Cover the entire video duration with no gaps
- Merge consecutive segments with the same emotion
- Return ONLY the JSON array, no markdown or explanation`,
          },
        ],
      },
    ],
  });

  const text = response.text.trim();
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Analyze emotions from ElevenLabs transcript using GPT-4o-mini.
 * Uses word-level timestamps to detect sentiment shifts.
 */
async function analyzeAudioEmotions(transcription) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const words = transcription.words || [];
  const fullText = transcription.text || '';

  if (!fullText.trim()) {
    return [];
  }

  // Build a timeline string from word timestamps
  const wordTimeline = words
    .map(w => `[${(w.start || 0).toFixed(1)}s] ${w.text || w.word}`)
    .join(' ');

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You analyze speech transcripts for emotional content. Given a timestamped transcript, identify emotion segments based on word choice, exclamations, repetition, and speech patterns.

Return JSON with this structure:
{"segments": [{"start_time": 0, "end_time": 5, "emotion": "excited", "confidence": 0.8, "description": "Repeated exclamations suggest excitement"}]}

Rules:
- start_time and end_time are in seconds (integers)
- emotion must be one of: happy, sad, angry, surprised, disgusted, fearful, neutral, excited, confused
- confidence is 0.0 to 1.0
- Cover the full transcript duration
- Merge consecutive segments with the same emotion`,
      },
      {
        role: 'user',
        content: `Full transcript: "${fullText}"\n\nWord timeline: ${wordTimeline}`,
      },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.segments || [];
}

/**
 * Merge video (visual) and audio (speech) emotion timelines using GPT-4o-mini.
 */
async function mergeEmotionTimelines(videoSegments, audioSegments, transcription) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You merge two emotion analysis timelines (visual and audio) into a single unified timeline.

Visual analysis comes from facial expressions/body language. Audio analysis comes from speech patterns/word choice.
When they agree, increase confidence. When they conflict, prefer visual analysis but note the discrepancy.

Return JSON with this structure:
{
  "segments": [{"start_time": 0, "end_time": 5, "emotion": "happy", "confidence": 0.9, "source": "both"}],
  "summary": "Brief one-sentence summary of the overall emotional arc"
}

Rules:
- source must be one of: "visual", "audio", "both"
- Merge overlapping segments intelligently
- Keep the timeline clean — no overlapping segments in the output
- Cover the full video duration`,
      },
      {
        role: 'user',
        content: `Visual emotion segments: ${JSON.stringify(videoSegments)}

Audio emotion segments: ${JSON.stringify(audioSegments)}

Transcript: "${transcription.text || ''}"`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Orchestrator: runs video + audio analysis in parallel, merges results.
 * Gracefully degrades if one analysis fails.
 */
async function analyzeEmotions(videoPath, transcription) {
  const [videoResult, audioResult] = await Promise.allSettled([
    analyzeVideoEmotions(videoPath),
    analyzeAudioEmotions(transcription),
  ]);

  const videoSegments = videoResult.status === 'fulfilled' ? videoResult.value : null;
  const audioSegments = audioResult.status === 'fulfilled' ? audioResult.value : null;

  if (videoResult.status === 'rejected') {
    console.error('   Video emotion analysis failed:', videoResult.reason?.message || videoResult.reason);
  }
  if (audioResult.status === 'rejected') {
    console.error('   Audio emotion analysis failed:', audioResult.reason?.message || audioResult.reason);
  }

  // Both failed
  if (!videoSegments && !audioSegments) {
    return null;
  }

  // Only one source available — skip merge
  if (!videoSegments || !audioSegments) {
    const segments = videoSegments || audioSegments;
    const source = videoSegments ? 'visual' : 'audio';
    return {
      segments: segments.map(s => ({ ...s, source })),
      summary: `Emotion analysis based on ${source} signals only.`,
    };
  }

  // Both available — merge
  try {
    return await mergeEmotionTimelines(videoSegments, audioSegments, transcription);
  } catch (error) {
    console.error('   Emotion merge failed, using video analysis:', error.message);
    return {
      segments: videoSegments.map(s => ({ ...s, source: 'visual' })),
      summary: 'Emotion analysis based on visual signals only (merge failed).',
    };
  }
}

const EMOTION_EMOJIS = {
  happy: '\u{1F60A}',
  sad: '\u{1F622}',
  angry: '\u{1F621}',
  surprised: '\u{1F632}',
  disgusted: '\u{1F922}',
  fearful: '\u{1F628}',
  neutral: '\u{1F610}',
  excited: '\u{1F929}',
  confused: '\u{1F615}',
};

/**
 * Format emotion analysis result into a WhatsApp-friendly message.
 */
function formatEmotionMessage(result) {
  if (!result || !result.segments || result.segments.length === 0) {
    return '';
  }

  const lines = ['\n\n\u{1F3AD} *Emotion Analysis:*'];

  for (const seg of result.segments) {
    const emoji = EMOTION_EMOJIS[seg.emotion] || '\u{1F3AD}';
    const start = formatTimestamp(seg.start_time);
    const end = formatTimestamp(seg.end_time);
    const check = seg.confidence >= 0.7 ? ' \u2713' : '';
    lines.push(`${emoji} ${start}-${end}: ${seg.emotion}${check}`);
  }

  if (result.summary) {
    lines.push(`\n\u{1F4A1} ${result.summary}`);
  }

  return lines.join('\n');
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
  analyzeEmotions,
  formatEmotionMessage,
};
