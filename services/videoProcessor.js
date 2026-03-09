const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

const { analyzeEmotions, formatEmotionMessage } = require('./emotionAnalyzer');

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

class VideoProcessor {
  constructor() {
    this.tmpDir = path.join(os.tmpdir(), 'goal-videos');
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  /**
   * Full pipeline: download video → transcribe with ElevenLabs → detect goal yelling → return result
   * @param {string} videoUrl - Infobip media URL
   * @returns {Promise<{durationSeconds: number, message: string}>}
   */
  async processGoalVideo(videoUrl) {
    const id = Date.now().toString();
    const videoPath = path.join(this.tmpDir, `${id}.mp4`);

    try {
      console.log(`\n⬇️  Downloading video from Infobip...`);
      await this.downloadVideo(videoUrl, videoPath);

      const fileSize = fs.statSync(videoPath).size;
      const fileSizeMB = fileSize / (1024 * 1024);
      console.log(`   Video file size: ${fileSizeMB.toFixed(1)} MB`);

      console.log(`🗣️  Transcribing with ElevenLabs Scribe v2...`);
      const transcription = await this.transcribeVideo(videoPath);

      console.log(`⚽ Detecting goal yelling...`);
      const result = this.detectGoalYelling(transcription);

      // Emotion analysis — runs independently, failure doesn't break goal detection
      try {
        console.log(`🎭 Analyzing emotions...`);
        const emotionResult = await analyzeEmotions(videoPath, transcription);
        const emotionMessage = formatEmotionMessage(emotionResult);
        if (emotionMessage) {
          result.message += emotionMessage;
        }
      } catch (error) {
        console.error('   Emotion analysis failed (non-fatal):', error.message);
      }

      return result;
    } finally {
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        console.log(`🧹 Cleaned up ${path.basename(videoPath)}`);
      }
    }
  }

  /**
   * Download video from Infobip media URL (requires API key auth)
   */
  async downloadVideo(url, destPath) {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`
      }
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  /**
   * Transcribe video using ElevenLabs Scribe v2 with word-level timestamps.
   * Accepts mp4 directly, up to 3GB.
   */
  async transcribeVideo(videoPath) {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured. Please add it to your .env file.');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(videoPath));
    form.append('model_id', 'scribe_v2');
    form.append('timestamps_granularity', 'word');

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/speech-to-text',
      form,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const data = response.data;
    console.log(`   Language detected: ${data.language_code || 'unknown'}`);
    console.log(`   Transcription: "${data.text}"`);
    return data;
  }

  /**
   * Detect "goal" yelling segments from ElevenLabs transcription.
   * ElevenLabs returns { text, words: [{ text, start, end, type }] }
   */
  detectGoalYelling(transcription) {
    const words = transcription.words || [];

    // Match variations of "goal" / "gol" in any language
    const goalPattern = /^(go+a*l+|go+l+)$/i;

    // ElevenLabs uses "text" for the word field (not "word" like Whisper)
    const goalWords = words.filter(w => {
      const wordText = (w.text || w.word || '').replace(/[^a-zA-Z]/g, '');
      return goalPattern.test(wordText);
    });

    if (goalWords.length === 0) {
      // Fall back: check full text for goal-like words
      const fullText = (transcription.text || '').toLowerCase();
      if (fullText.includes('goal') || fullText.includes('gol')) {
        // Try to find any words containing "goal"/"gol" with looser matching
        const looseGoalWords = words.filter(w => {
          const wordText = (w.text || w.word || '').toLowerCase();
          return /go+a*l|go+l/i.test(wordText);
        });
        if (looseGoalWords.length > 0) {
          const totalSeconds = looseGoalWords.reduce((sum, w) => sum + ((w.end || 0) - (w.start || 0)), 0);
          return this.formatResult(totalSeconds);
        }
      }

      return {
        durationSeconds: 0,
        message: `We couldn't detect any "goooal" yelling in your video. Try again and yell louder! ⚽🔊`
      };
    }

    // Group consecutive goal words into yelling "streaks"
    const streaks = [];
    let currentStreak = { start: goalWords[0].start, end: goalWords[0].end };

    for (let i = 1; i < goalWords.length; i++) {
      // If the gap between words is < 2 seconds, treat as same streak
      if (goalWords[i].start - currentStreak.end < 2) {
        currentStreak.end = goalWords[i].end;
      } else {
        streaks.push(currentStreak);
        currentStreak = { start: goalWords[i].start, end: goalWords[i].end };
      }
    }
    streaks.push(currentStreak);

    const totalSeconds = streaks.reduce((sum, s) => sum + (s.end - s.start), 0);

    return this.formatResult(totalSeconds);
  }

  /**
   * Format the result into a friendly WhatsApp message
   */
  formatResult(totalSeconds) {
    const durationText = this.formatDuration(totalSeconds);

    const message = `You were yelling GOOOAL for ${durationText}! Bravo! ⚽🎉\n\nHere is your discount code for Coca-Cola: GOAL2025 🥤🎁`;

    return {
      durationSeconds: totalSeconds,
      message
    };
  }

  /**
   * Format seconds into a human-readable duration string
   */
  formatDuration(seconds) {
    if (seconds < 1) {
      return 'less than a second';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);

    if (mins === 0) {
      return `${secs} second${secs !== 1 ? 's' : ''}`;
    }
    if (secs === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    return `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
  }
}

module.exports = new VideoProcessor();
