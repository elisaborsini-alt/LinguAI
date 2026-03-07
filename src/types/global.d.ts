/**
 * Global type declarations for React Native environment.
 *
 * These ambient declarations cover Web API types used in audio processing
 * modules (AudioContext, AnalyserNode, etc.) that are provided at runtime
 * by react-native-audio-api or polyfills but lack built-in TS definitions.
 */

// Base64 encoding/decoding (available via RN's JSC/Hermes runtime)
declare function atob(encoded: string): string;
declare function btoa(data: string): string;

// NodeJS timer types for setInterval/setTimeout refs
declare namespace NodeJS {
  interface Timeout {}
}

// AnalyserNode — used by audioAnalyzer.ts for audio feature extraction.
// react-native-audio-api doesn't export an AnalyserNode type, so we
// declare it globally for use as a type annotation.
interface AnalyserNode {
  fftSize: number;
  frequencyBinCount: number;
  getByteFrequencyData(array: Uint8Array): void;
  getByteTimeDomainData(array: Uint8Array): void;
  getFloatFrequencyData(array: Float32Array): void;
  getFloatTimeDomainData(array: Float32Array): void;
  connect(destination: AnalyserNode): AnalyserNode;
  disconnect(): void;
}

// victory-native v40 module declaration
// The codebase uses legacy Victory API (VictoryChart, VictoryLine, etc.)
// which is not exported by victory-native v40. This declaration allows
// the code to compile while a migration to the v40 API is pending.
declare module 'victory-native' {
  import React from 'react';

  export const VictoryChart: React.ComponentType<Record<string, unknown>>;
  export const VictoryLine: React.ComponentType<Record<string, unknown>>;
  export const VictoryAxis: React.ComponentType<Record<string, unknown>>;
  export const VictoryArea: React.ComponentType<Record<string, unknown>>;
  export const VictoryLegend: React.ComponentType<Record<string, unknown>>;
  export const VictoryTheme: { material: Record<string, unknown> };
}
