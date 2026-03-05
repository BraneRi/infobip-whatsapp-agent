const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
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
   * Full pipeline: download video → extract audio → transcribe → detect goal yelling → return result
   * @param {string} videoUrl - Infobip media URL
   * @returns {Promise<{durationSeconds: number, message: string}>}
   */
  async processGoalVideo(videoUrl) {
    const id = Date.now().toString();
    const videoPath = path.join(this.tmpDir, `${id}.mp4`);
    const audioPath = path.join(this.tmpDir, `${id}.wav`);

    try {
      console.log(`\n⬇️  Downloading video from Infobip...`);
      await this.downloadVideo(videoUrl, videoPath);

      console.log(`🎵 Extracting audio...`);
      this.extractAudio(videoPath, audioPath);

      // Whisper API has a 25MB file size limit
      const audioSize = fs.statSync(audioPath).size;
      const audioSizeMB = audioSize / (1024 * 1024);
      console.log(`   Audio file size: ${audioSizeMB.toFixed(1)} MB`);
      if (audioSizeMB > 25) {
        throw new Error(`Audio file too large for Whisper API (${audioSizeMB.toFixed(1)} MB, max 25 MB). Try a shorter video.`);
      }

      console.log(`🗣️  Transcribing with Whisper...`);
      const transcription = await this.transcribeAudio(audioPath);

      console.log(`⚽ Detecting goal yelling...`);
      const result = this.detectGoalYelling(transcription);

      return result;
    } finally {
      // Clean up temp files
      for (const f of [videoPath, audioPath]) {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
          console.log(`🧹 Cleaned up ${path.basename(f)}`);
        }
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
   * Extract audio from video using ffmpeg (mono 16kHz WAV for Whisper)
   */
  extractAudio(videoPath, audioPath) {
    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`,
      { stdio: 'pipe' }
    );
  }

  /**
   * Transcribe audio using OpenAI Whisper with word-level timestamps
   */
  async transcribeAudio(audioPath) {
    const audioFile = fs.createReadStream(audioPath);

    const response = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
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

    // Calculate total duration from first goal word start to last goal word end
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
