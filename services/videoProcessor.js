const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const OpenAI = require('openai');

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

class VideoProcessor {
  constructor() {
    this.client = new OpenAI({ apiKey: OPENAI_API_KEY });
    this.tmpDir = path.join(os.tmpdir(), 'goal-videos');
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  /**
   * Full pipeline: download video → send to Whisper → detect goal yelling → return result
   * @param {string} videoUrl - Infobip media URL
   * @returns {Promise<{durationSeconds: number, message: string}>}
   */
  async processGoalVideo(videoUrl) {
    const id = Date.now().toString();
    const videoPath = path.join(this.tmpDir, `${id}.mp4`);

    try {
      console.log(`\n⬇️  Downloading video from Infobip...`);
      await this.downloadVideo(videoUrl, videoPath);

      // Whisper API has a 25MB file size limit
      const fileSize = fs.statSync(videoPath).size;
      const fileSizeMB = fileSize / (1024 * 1024);
      console.log(`   Video file size: ${fileSizeMB.toFixed(1)} MB`);
      if (fileSizeMB > 25) {
        throw new Error(`Video file too large for Whisper API (${fileSizeMB.toFixed(1)} MB, max 25 MB). Try a shorter video.`);
      }

      console.log(`🗣️  Transcribing with Whisper (sending mp4 directly)...`);
      const transcription = await this.transcribeVideo(videoPath);

      console.log(`⚽ Detecting goal yelling...`);
      const result = this.detectGoalYelling(transcription);

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
   * Transcribe video using OpenAI Whisper with word-level timestamps.
   * Whisper accepts mp4 directly — no need for ffmpeg audio extraction.
   */
  async transcribeVideo(videoPath) {
    const file = fs.createReadStream(videoPath);

    const response = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file: file,
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    });

    console.log(`   Transcription: "${response.text}"`);
    return response;
  }

  /**
   * Detect "goal" yelling segments from Whisper transcription.
   * Returns total duration and a formatted message.
   */
  detectGoalYelling(transcription) {
    const words = transcription.words || [];

    // Match variations of "goal" / "gol" in any language
    const goalPattern = /^(go+a*l+|go+l+)$/i;

    const goalWords = words.filter(w => goalPattern.test(w.word.replace(/[^a-zA-Z]/g, '')));

    if (goalWords.length === 0) {
      // Fall back: check full text for goal-like words
      const fullText = (transcription.text || '').toLowerCase();
      if (fullText.includes('goal') || fullText.includes('gol')) {
        // Use segment-level timestamps if word-level didn't match
        const segments = transcription.segments || [];
        const goalSegments = segments.filter(s =>
          /go+a*l|go+l/i.test(s.text)
        );
        if (goalSegments.length > 0) {
          const totalSeconds = goalSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
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
