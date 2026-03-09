/**
 * Audio feature extraction for emotion detection
 *
 * This module analyzes audio characteristics to detect emotional signals
 * like pitch, energy, speech rate, and pauses.
 */

import type {AudioContext} from 'react-native-audio-api';

export interface AudioFeatures {
  // Pitch analysis
  pitch: {
    mean: number;
    variance: number;
    trend: 'rising' | 'falling' | 'stable';
    min: number;
    max: number;
  };

  // Energy/volume analysis
  energy: {
    mean: number;
    variance: number;
    peaks: number;
  };

  // Speech pattern analysis
  speechRate: {
    wordsPerMinute: number;
    syllablesPerSecond: number;
    trend: 'accelerating' | 'decelerating' | 'stable';
  };

  // Pause analysis
  pauses: {
    count: number;
    totalDuration: number;
    averageDuration: number;
    longestPause: number;
  };

  // Duration
  totalDuration: number;
  speechDuration: number;
  silenceDuration: number;
}

export interface EmotionSignals {
  pitch: {
    mean: number;
    variance: number;
    trend: 'rising' | 'falling' | 'stable';
  };
  speechRate: {
    wordsPerMinute: number;
    trend: 'accelerating' | 'decelerating' | 'stable';
  };
  energy: {
    mean: number;
    variance: number;
  };
  pauses: {
    frequency: number;
    averageDuration: number;
    fillerWords: number;
  };
  fluency: {
    hesitations: number;
    restarts: number;
    incompleteUtterances: number;
  };
  sessionDuration: number;
  messageCount: number;
}

// Constants for audio analysis
const SILENCE_THRESHOLD = 0.05; // Normalized amplitude threshold for silence
const PAUSE_MIN_DURATION = 200; // Minimum pause duration in ms
// Pitch sample rate: 50 Hz for pitch tracking (reserved for future use)

class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private pitchHistory: number[] = [];
  private energyHistory: number[] = [];
  private speechRateHistory: number[] = [];
  private pauseTimestamps: Array<{ start: number; end: number }> = [];
  private lastSpeechTime: number = 0;
  private isCurrentlySilent: boolean = true;
  private silenceStartTime: number = 0;
  private sessionStartTime: number = 0;
  private wordCount: number = 0;

  /**
   * Initialize the audio analyzer
   */
  async initialize(): Promise<boolean> {
    try {
      // Create AudioContext (may need polyfill for React Native)
      // In React Native, we'd use react-native-audio-api or similar
      this.sessionStartTime = Date.now();
      this.reset();
      console.log('[AudioAnalyzer] Initialized');
      return true;
    } catch (error) {
      console.error('[AudioAnalyzer] Initialization error:', error);
      return false;
    }
  }

  /**
   * Process audio data and extract features
   * In React Native, this would receive audio data from the microphone
   */
  processAudioData(audioData: Float32Array, sampleRate: number): void {
    const currentTime = Date.now();

    // Calculate RMS energy
    const energy = this.calculateRMS(audioData);
    this.energyHistory.push(energy);

    // Keep last 100 samples
    if (this.energyHistory.length > 100) {
      this.energyHistory.shift();
    }

    // Detect silence/speech
    const isSilent = energy < SILENCE_THRESHOLD;

    if (isSilent && !this.isCurrentlySilent) {
      // Transition to silence - start of pause
      this.silenceStartTime = currentTime;
      this.isCurrentlySilent = true;
    } else if (!isSilent && this.isCurrentlySilent) {
      // Transition to speech - end of pause
      const pauseDuration = currentTime - this.silenceStartTime;
      if (pauseDuration >= PAUSE_MIN_DURATION) {
        this.pauseTimestamps.push({
          start: this.silenceStartTime,
          end: currentTime,
        });
      }
      this.lastSpeechTime = currentTime;
      this.isCurrentlySilent = false;
    }

    // Estimate pitch (simplified - in production use autocorrelation or FFT)
    if (!isSilent) {
      const pitch = this.estimatePitch(audioData, sampleRate);
      if (pitch > 0) {
        this.pitchHistory.push(pitch);
        if (this.pitchHistory.length > 50) {
          this.pitchHistory.shift();
        }
      }
    }
  }

  /**
   * Update word count from transcript
   */
  updateWordCount(transcript: string): void {
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    this.wordCount = words.length;

    // Estimate syllables for speech rate
    const syllables = this.estimateSyllables(transcript);
    const elapsedSeconds = (Date.now() - this.sessionStartTime) / 1000;
    if (elapsedSeconds > 0) {
      const syllablesPerSecond = syllables / elapsedSeconds;
      this.speechRateHistory.push(syllablesPerSecond);
      if (this.speechRateHistory.length > 20) {
        this.speechRateHistory.shift();
      }
    }
  }

  /**
   * Detect hesitations and restarts in transcript
   */
  analyzeTranscriptFluency(transcript: string): {
    hesitations: number;
    restarts: number;
    fillerWords: number;
    incompleteUtterances: number;
  } {
    const hesitationPatterns = /\b(um+|uh+|er+|ah+|hmm+)\b/gi;
    const fillerPatterns = /\b(like|you know|i mean|basically|actually|so|well)\b/gi;
    const restartPatterns = /(\w+)\s+\1\b/gi; // Repeated words
    const incompletePatterns = /\.{3}|—|–|-{2,}|\.\.\.|\.\.$/g;

    const hesitations = (transcript.match(hesitationPatterns) || []).length;
    const fillerWords = (transcript.match(fillerPatterns) || []).length;
    const restarts = (transcript.match(restartPatterns) || []).length;
    const incompleteUtterances = (transcript.match(incompletePatterns) || []).length;

    return {
      hesitations,
      restarts,
      fillerWords,
      incompleteUtterances,
    };
  }

  /**
   * Get current emotion signals for the backend
   */
  getEmotionSignals(transcript: string, messageCount: number): EmotionSignals {
    const fluency = this.analyzeTranscriptFluency(transcript);
    const elapsedSeconds = Math.max(1, (Date.now() - this.sessionStartTime) / 1000);

    // Calculate pitch statistics
    const pitchMean = this.calculateMean(this.pitchHistory) || 150;
    const pitchVariance = this.calculateVariance(this.pitchHistory) || 30;
    const pitchTrend = this.calculateTrend(this.pitchHistory);

    // Calculate energy statistics
    const energyMean = this.calculateMean(this.energyHistory) || 0.5;
    const energyVariance = this.calculateVariance(this.energyHistory) || 0.1;

    // Calculate speech rate
    const wordsPerMinute = (this.wordCount / elapsedSeconds) * 60;
    const speechRateTrendRaw = this.calculateTrend(this.speechRateHistory);
    const speechRateTrend = speechRateTrendRaw === 'rising' ? 'accelerating' as const
      : speechRateTrendRaw === 'falling' ? 'decelerating' as const
      : 'stable' as const;

    // Calculate pause statistics
    const totalPauses = this.pauseTimestamps.length;
    const pauseDurations = this.pauseTimestamps.map(p => p.end - p.start);
    const avgPauseDuration = pauseDurations.length > 0
      ? pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length
      : 500;
    const pauseFrequency = totalPauses / (elapsedSeconds / 60); // pauses per minute

    return {
      pitch: {
        mean: pitchMean,
        variance: pitchVariance,
        trend: pitchTrend,
      },
      speechRate: {
        wordsPerMinute,
        trend: speechRateTrend,
      },
      energy: {
        mean: energyMean,
        variance: energyVariance,
      },
      pauses: {
        frequency: pauseFrequency,
        averageDuration: avgPauseDuration,
        fillerWords: fluency.fillerWords,
      },
      fluency: {
        hesitations: fluency.hesitations,
        restarts: fluency.restarts,
        incompleteUtterances: fluency.incompleteUtterances,
      },
      sessionDuration: elapsedSeconds,
      messageCount,
    };
  }

  /**
   * Get full audio features for detailed analysis
   */
  getAudioFeatures(): AudioFeatures {
    const elapsedMs = Date.now() - this.sessionStartTime;
    const totalPauseDuration = this.pauseTimestamps.reduce(
      (sum, p) => sum + (p.end - p.start),
      0,
    );

    return {
      pitch: {
        mean: this.calculateMean(this.pitchHistory) || 150,
        variance: this.calculateVariance(this.pitchHistory) || 30,
        trend: this.calculateTrend(this.pitchHistory),
        min: Math.min(...this.pitchHistory) || 100,
        max: Math.max(...this.pitchHistory) || 200,
      },
      energy: {
        mean: this.calculateMean(this.energyHistory) || 0.5,
        variance: this.calculateVariance(this.energyHistory) || 0.1,
        peaks: this.countPeaks(this.energyHistory),
      },
      speechRate: {
        wordsPerMinute: (this.wordCount / (elapsedMs / 1000)) * 60,
        syllablesPerSecond: this.calculateMean(this.speechRateHistory) || 3,
        trend: (() => {
          const t = this.calculateTrend(this.speechRateHistory);
          return t === 'rising' ? 'accelerating' as const
            : t === 'falling' ? 'decelerating' as const
            : 'stable' as const;
        })(),
      },
      pauses: {
        count: this.pauseTimestamps.length,
        totalDuration: totalPauseDuration,
        averageDuration: this.pauseTimestamps.length > 0
          ? totalPauseDuration / this.pauseTimestamps.length
          : 0,
        longestPause: Math.max(
          ...this.pauseTimestamps.map(p => p.end - p.start),
          0,
        ),
      },
      totalDuration: elapsedMs,
      speechDuration: elapsedMs - totalPauseDuration,
      silenceDuration: totalPauseDuration,
    };
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.pitchHistory = [];
    this.energyHistory = [];
    this.speechRateHistory = [];
    this.pauseTimestamps = [];
    this.lastSpeechTime = 0;
    this.isCurrentlySilent = true;
    this.silenceStartTime = Date.now();
    this.sessionStartTime = Date.now();
    this.wordCount = 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.reset();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }

  // Private helper methods

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private estimatePitch(data: Float32Array, sampleRate: number): number {
    // Simple zero-crossing rate pitch estimation
    // In production, use autocorrelation or FFT-based methods
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) {
        crossings++;
      }
    }
    const frequency = (crossings * sampleRate) / (2 * data.length);

    // Filter to typical human voice range (85-300 Hz)
    if (frequency >= 85 && frequency <= 300) {
      return frequency;
    }
    return 0;
  }

  private estimateSyllables(text: string): number {
    // Simple syllable estimation
    const words = text.toLowerCase().split(/\s+/);
    let syllables = 0;

    for (const word of words) {
      // Count vowel groups
      const vowelGroups = word.match(/[aeiouy]+/g);
      if (vowelGroups) {
        syllables += vowelGroups.length;
        // Subtract silent 'e' at end
        if (word.endsWith('e') && word.length > 2) {
          syllables--;
        }
      }
      // Minimum 1 syllable per word
      if (word.length > 0) {
        syllables = Math.max(syllables, 1);
      }
    }

    return syllables;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) {return 0;}
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) {return 0;}
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return this.calculateMean(squaredDiffs);
  }

  private calculateTrend(values: number[]): 'rising' | 'falling' | 'stable' {
    if (values.length < 5) {return 'stable';}

    const recentHalf = values.slice(-Math.floor(values.length / 2));
    const olderHalf = values.slice(0, Math.floor(values.length / 2));

    const recentMean = this.calculateMean(recentHalf);
    const olderMean = this.calculateMean(olderHalf);

    const threshold = 0.1 * olderMean;

    if (recentMean > olderMean + threshold) {return 'rising';}
    if (recentMean < olderMean - threshold) {return 'falling';}
    return 'stable';
  }

  private countPeaks(values: number[]): number {
    if (values.length < 3) {return 0;}

    let peaks = 0;
    const threshold = this.calculateMean(values) * 1.5;

    for (let i = 1; i < values.length - 1; i++) {
      if (
        values[i] > values[i - 1] &&
        values[i] > values[i + 1] &&
        values[i] > threshold
      ) {
        peaks++;
      }
    }

    return peaks;
  }
}

// Export singleton instance
export const audioAnalyzer = new AudioAnalyzer();

export default audioAnalyzer;
