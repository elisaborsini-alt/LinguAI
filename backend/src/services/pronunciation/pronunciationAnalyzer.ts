import * as fs from 'fs';
import * as path from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

export interface PitchPoint {
  time: number;
  frequency: number;
  confidence: number;
}

export interface TimingSegment {
  word: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface PronunciationAnalysis {
  overallScore: number;
  rhythmScore: number;
  pitchScore: number;
  clarityScore: number;
  durationMs: number;
  userPitchContour: PitchPoint[];
  referencePitchContour: PitchPoint[];
  userTimingSegments: TimingSegment[];
  referenceTimingSegments: TimingSegment[];
  wordScores: Array<{
    word: string;
    score: number;
    issue?: string;
  }>;
}

export interface PronunciationFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
  nextSteps: string[];
  focusAreas: Array<{
    area: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface AnalysisInput {
  userAudioPath: string;
  referenceAudioPath: string;
  expectedText: string;
  languageCode: string;
}

export class PronunciationAnalyzer {
  private readonly tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'pronunciation');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, {recursive: true});
    }
  }

  /**
   * Main analysis entry point
   */
  async analyze(input: AnalysisInput): Promise<{
    analysis: PronunciationAnalysis;
    feedback: PronunciationFeedback;
  }> {
    // Extract features from both audio files
    const [userFeatures, referenceFeatures] = await Promise.all([
      this.extractAudioFeatures(input.userAudioPath),
      this.extractAudioFeatures(input.referenceAudioPath),
    ]);

    // Get transcription for clarity scoring
    const transcription = await this.transcribeAudio(
      input.userAudioPath,
      input.languageCode,
    );

    // Calculate individual scores
    const rhythmScore = this.calculateRhythmScore(
      referenceFeatures.timingSegments,
      userFeatures.timingSegments,
    );

    const pitchScore = this.calculatePitchScore(
      referenceFeatures.pitchContour,
      userFeatures.pitchContour,
    );

    const clarityResult = this.calculateClarityScore(
      transcription.text,
      input.expectedText,
      transcription.confidence,
    );

    // Calculate word-level scores
    const wordScores = this.calculateWordScores(
      transcription.words,
      input.expectedText,
    );

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      rhythmScore * 0.3 + pitchScore * 0.35 + clarityResult.score * 0.35,
    );

    const analysis: PronunciationAnalysis = {
      overallScore,
      rhythmScore: Math.round(rhythmScore),
      pitchScore: Math.round(pitchScore),
      clarityScore: Math.round(clarityResult.score),
      durationMs: userFeatures.durationMs,
      userPitchContour: userFeatures.pitchContour,
      referencePitchContour: referenceFeatures.pitchContour,
      userTimingSegments: userFeatures.timingSegments,
      referenceTimingSegments: referenceFeatures.timingSegments,
      wordScores,
    };

    const feedback = this.generateFeedback(analysis, clarityResult.issues);

    return {analysis, feedback};
  }

  /**
   * Extract audio features: pitch contour, timing, duration
   */
  private async extractAudioFeatures(audioPath: string): Promise<{
    pitchContour: PitchPoint[];
    timingSegments: TimingSegment[];
    durationMs: number;
  }> {
    // In production, this would use proper audio analysis libraries
    // like praat-parselmouth, librosa, or a speech analysis API

    // Get audio duration using ffprobe
    const durationMs = await this.getAudioDuration(audioPath);

    // Extract pitch contour
    const pitchContour = await this.extractPitchContour(audioPath, durationMs);

    // Extract timing segments (would use forced alignment in production)
    const timingSegments = await this.extractTimingSegments(audioPath, durationMs);

    return {
      pitchContour,
      timingSegments,
      durationMs,
    };
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const {stdout} = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      );
      return Math.round(parseFloat(stdout.trim()) * 1000);
    } catch {
      // Fallback to estimated duration
      return 2000;
    }
  }

  /**
   * Extract pitch contour from audio
   * In production, would use praat-parselmouth or similar
   */
  private async extractPitchContour(
    audioPath: string,
    durationMs: number,
  ): Promise<PitchPoint[]> {
    // Simulated pitch extraction - in production, use proper pitch detection
    // This would use algorithms like YIN, SWIPE, or pYIN
    const numPoints = Math.floor(durationMs / 10); // One point every 10ms
    const pitchContour: PitchPoint[] = [];

    // Generate realistic pitch contour pattern
    const basePitch = 120 + Math.random() * 80; // Base frequency 120-200 Hz

    for (let i = 0; i < numPoints; i++) {
      const time = (i * 10) / 1000;
      const progress = i / numPoints;

      // Simulate natural pitch variation
      const variation = Math.sin(progress * Math.PI * 2) * 20;
      const noise = (Math.random() - 0.5) * 10;

      pitchContour.push({
        time,
        frequency: basePitch + variation + noise,
        confidence: 0.8 + Math.random() * 0.2,
      });
    }

    return pitchContour;
  }

  /**
   * Extract timing segments using forced alignment
   * In production, would use Montreal Forced Aligner or similar
   */
  private async extractTimingSegments(
    audioPath: string,
    durationMs: number,
  ): Promise<TimingSegment[]> {
    // Simulated timing extraction
    // In production, use forced alignment with the expected text
    const segments: TimingSegment[] = [];
    const numSegments = 3 + Math.floor(Math.random() * 3);
    const segmentDuration = durationMs / numSegments;

    for (let i = 0; i < numSegments; i++) {
      segments.push({
        word: `word_${i}`,
        startTime: i * segmentDuration,
        endTime: (i + 1) * segmentDuration,
        duration: segmentDuration,
      });
    }

    return segments;
  }

  /**
   * Transcribe audio using speech-to-text
   */
  private async transcribeAudio(
    audioPath: string,
    languageCode: string,
  ): Promise<{
    text: string;
    confidence: number;
    words: Array<{word: string; confidence: number; startTime: number; endTime: number}>;
  }> {
    // In production, use Google Cloud Speech-to-Text, Whisper, or similar
    // For now, return simulated results

    return {
      text: 'transcribed text placeholder',
      confidence: 0.85,
      words: [
        {word: 'transcribed', confidence: 0.9, startTime: 0, endTime: 500},
        {word: 'text', confidence: 0.85, startTime: 500, endTime: 900},
        {word: 'placeholder', confidence: 0.8, startTime: 900, endTime: 1500},
      ],
    };
  }

  /**
   * Calculate rhythm score using Dynamic Time Warping
   */
  calculateRhythmScore(
    referenceSegments: TimingSegment[],
    userSegments: TimingSegment[],
  ): number {
    if (referenceSegments.length === 0 || userSegments.length === 0) {
      return 50;
    }

    // Normalize durations
    const refDurations = referenceSegments.map(s => s.duration);
    const userDurations = userSegments.map(s => s.duration);

    const refTotal = refDurations.reduce((a, b) => a + b, 0);
    const userTotal = userDurations.reduce((a, b) => a + b, 0);

    const refNorm = refDurations.map(d => d / refTotal);
    const userNorm = userDurations.map(d => d / userTotal);

    // Calculate DTW distance
    const dtwDistance = this.dynamicTimeWarping(refNorm, userNorm);

    // Convert distance to score (0-100)
    const maxDistance = Math.max(refNorm.length, userNorm.length);
    const normalizedDistance = dtwDistance / maxDistance;

    // Lower distance = higher score
    const score = Math.max(0, 100 - normalizedDistance * 200);

    return Math.min(100, score);
  }

  /**
   * Dynamic Time Warping implementation
   */
  private dynamicTimeWarping(seq1: number[], seq2: number[]): number {
    const n = seq1.length;
    const m = seq2.length;

    // Initialize DTW matrix
    const dtw: number[][] = Array.from({length: n + 1}, () =>
      Array(m + 1).fill(Infinity),
    );
    dtw[0][0] = 0;

    // Fill DTW matrix
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = Math.abs(seq1[i - 1] - seq2[j - 1]);
        dtw[i][j] =
          cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
      }
    }

    return dtw[n][m];
  }

  /**
   * Calculate pitch score using correlation
   */
  calculatePitchScore(
    referencePitch: PitchPoint[],
    userPitch: PitchPoint[],
  ): number {
    if (referencePitch.length === 0 || userPitch.length === 0) {
      return 50;
    }

    // Resample to same length
    const targetLength = Math.min(referencePitch.length, userPitch.length, 100);
    const refResampled = this.resamplePitch(referencePitch, targetLength);
    const userResampled = this.resamplePitch(userPitch, targetLength);

    // Calculate Pearson correlation
    const correlation = this.pearsonCorrelation(
      refResampled.map(p => p.frequency),
      userResampled.map(p => p.frequency),
    );

    // Calculate mean pitch difference penalty
    const refMean =
      refResampled.reduce((a, p) => a + p.frequency, 0) / refResampled.length;
    const userMean =
      userResampled.reduce((a, p) => a + p.frequency, 0) / userResampled.length;
    const meanDiffPenalty = Math.min(Math.abs(refMean - userMean) / refMean, 0.5);

    // Combine correlation and mean difference
    const score = (correlation + 1) * 50 - meanDiffPenalty * 30;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Resample pitch contour to target length
   */
  private resamplePitch(pitch: PitchPoint[], targetLength: number): PitchPoint[] {
    const result: PitchPoint[] = [];
    const step = pitch.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const index = Math.floor(i * step);
      result.push(pitch[Math.min(index, pitch.length - 1)]);
    }

    return result;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Calculate clarity score based on STT results
   */
  calculateClarityScore(
    transcribed: string,
    expected: string,
    sttConfidence: number,
  ): {score: number; issues: string[]} {
    const issues: string[] = [];

    // Normalize texts
    const normalizedTranscribed = transcribed.toLowerCase().trim();
    const normalizedExpected = expected.toLowerCase().trim();

    // Calculate Levenshtein similarity
    const similarity = this.levenshteinSimilarity(
      normalizedTranscribed,
      normalizedExpected,
    );

    // Combine with STT confidence
    const score = similarity * 0.7 + sttConfidence * 100 * 0.3;

    // Identify issues
    if (similarity < 0.8) {
      issues.push('Some words may have been mispronounced');
    }
    if (sttConfidence < 0.7) {
      issues.push('Speech clarity could be improved');
    }

    return {score: Math.min(100, Math.max(0, score)), issues};
  }

  /**
   * Calculate Levenshtein similarity (0-100)
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 100;
    return (1 - distance / maxLen) * 100;
  }

  /**
   * Calculate Levenshtein edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    const dp: number[][] = Array.from({length: m + 1}, (_, i) =>
      Array.from({length: n + 1}, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate word-level scores
   */
  private calculateWordScores(
    transcribedWords: Array<{word: string; confidence: number}>,
    expectedText: string,
  ): Array<{word: string; score: number; issue?: string}> {
    const expectedWords = expectedText.toLowerCase().split(/\s+/);
    const results: Array<{word: string; score: number; issue?: string}> = [];

    expectedWords.forEach((word, index) => {
      const transcribed = transcribedWords[index];

      if (!transcribed) {
        results.push({
          word,
          score: 0,
          issue: 'Word not detected',
        });
        return;
      }

      const similarity = this.levenshteinSimilarity(
        transcribed.word.toLowerCase(),
        word,
      );
      const score = Math.round(similarity * 0.6 + transcribed.confidence * 100 * 0.4);

      let issue: string | undefined;
      if (score < 60) {
        issue = 'Needs practice';
      } else if (score < 80) {
        issue = 'Could be clearer';
      }

      results.push({word, score, issue});
    });

    return results;
  }

  /**
   * Generate detailed feedback based on analysis
   */
  generateFeedback(
    analysis: PronunciationAnalysis,
    clarityIssues: string[],
  ): PronunciationFeedback {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const tips: string[] = [];
    const focusAreas: PronunciationFeedback['focusAreas'] = [];

    // Analyze rhythm
    if (analysis.rhythmScore >= 80) {
      strengths.push('Speech rhythm and pacing are close to the reference');
    } else if (analysis.rhythmScore >= 60) {
      improvements.push('Work on matching the natural rhythm of the phrase');
      tips.push('Try listening to the reference more times before recording');
    } else {
      improvements.push('Focus on the timing between words');
      tips.push('Practice speaking more slowly and matching the pace');
      focusAreas.push({
        area: 'Rhythm',
        description: 'Your speech timing differs significantly from the native speaker',
        priority: 'high',
      });
    }

    // Analyze pitch
    if (analysis.pitchScore >= 80) {
      strengths.push('Good intonation patterns');
    } else if (analysis.pitchScore >= 60) {
      improvements.push('Pay attention to rising and falling tones');
      tips.push('Notice how the pitch changes throughout the sentence');
    } else {
      improvements.push('Intonation needs significant practice');
      focusAreas.push({
        area: 'Intonation',
        description: 'Your pitch pattern differs from the native speaker',
        priority: 'high',
      });
    }

    // Analyze clarity
    if (analysis.clarityScore >= 80) {
      strengths.push('Clear pronunciation of individual sounds');
    } else if (analysis.clarityScore >= 60) {
      improvements.push('Some sounds could be clearer');
      clarityIssues.forEach(issue => tips.push(issue));
    } else {
      improvements.push('Focus on pronouncing each sound distinctly');
      focusAreas.push({
        area: 'Clarity',
        description: 'Some sounds are difficult to understand',
        priority: 'high',
      });
    }

    // Generate summary
    let summary: string;
    if (analysis.overallScore >= 80) {
      summary = 'Very close to the reference. The pronunciation sounds natural.';
    } else if (analysis.overallScore >= 60) {
      summary = 'Getting closer. A few areas to keep working on.';
    } else if (analysis.overallScore >= 40) {
      summary = 'There is room to grow. The highlighted areas show where to focus.';
    } else {
      summary = 'This phrase needs more practice. Listening to the reference can help.';
    }

    // Generate next steps
    const nextSteps: string[] = [];
    if (focusAreas.length > 0) {
      nextSteps.push(`Focus on improving your ${focusAreas[0].area.toLowerCase()}`);
    }
    nextSteps.push('Practice this phrase a few more times');
    if (analysis.overallScore >= 70) {
      nextSteps.push('Try a more challenging phrase');
    }

    return {
      summary,
      strengths,
      improvements,
      tips,
      nextSteps,
      focusAreas,
    };
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export default PronunciationAnalyzer;
