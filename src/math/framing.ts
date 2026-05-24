/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { makeSmallDemoSignal, makeSignal, SignalType, evaluateSmoothDeterministicXC } from './signal';
import { makeWindow, applyWindow, coherentGain } from './window';

/**
 * Computes the total number of samples from duration and sampling rate.
 */
export function computeN(T_total: number, fs: number): number {
  return Math.floor(T_total * fs);
}

/**
 * Computes the sample count based on sampleCountMode.
 */
export function computeSampleCount(config: {
  sampleCountMode?: 'fixed_N' | 'fixed_duration';
  T_total?: number;
  fs: number;
  N: number;
}): number {
  const mode = config.sampleCountMode ?? 'fixed_N';
  const T_total = config.T_total ?? 1.0;
  const fs = config.fs; // Use raw fs
  
  if (mode === 'fixed_duration') {
    if (fs <= 0) {
      return 1;
    }
    return Math.floor(T_total * fs);
  }
  return Math.round(config.N);
}

/**
 * Generates signal values for N samples.
 */
export function makeSignalValues(config: {
  isSmallDemo?: boolean;
  signalSourceKind: 'analytic' | 'discrete_only' | 'interpolation_guide';
  signalType: SignalType;
  fs: number;
  seed: number;
}, N: number): number[] {
  if (config.isSmallDemo) {
    return makeSmallDemoSignal();
  }
  if (config.signalSourceKind === 'analytic') {
    return Array.from({ length: N }, (_, g) => evaluateSmoothDeterministicXC(g / config.fs));
  }
  return makeSignal(config.signalType, N, config.seed, 16);
}

/**
 * Computes the number of valid complete frames.
 * M = floor((N - L) / H) + 1 if N >= L, else 0.
 */
export function computeFrameCount(N: number, L: number, H: number): number {
  if (N < L || L <= 0 || H <= 0) return 0;
  return Math.floor((N - L) / H) + 1;
}

/**
 * Generates an array of starting indices for all frames.
 */
export function computeFrameStarts(M: number, H: number): number[] {
  const starts: number[] = [];
  for (let m = 0; m < M; m++) {
    starts.push(m * H);
  }
  return starts;
}

/**
 * Computes the half-open range and discrete set of indices for frame m.
 * I_m = {mH, mH + 1, ..., mH + L - 1}
 */
export interface FrameInterval {
  m: number;
  start: number; // s_m = m * H
  endExcl: number; // s_m + L (the half-open bound)
  indices: number[];
}

export function computeFrameInterval(m: number, L: number, H: number): FrameInterval {
  const start = m * H;
  const endExcl = start + L;
  const indices: number[] = [];
  for (let l = 0; l < L; l++) {
    indices.push(start + l);
  }
  return { m, start, endExcl, indices };
}

/**
 * Computes all frame intervals for N, L, H
 */
export function computeAllFrameIntervals(N: number, L: number, H: number): FrameInterval[] {
  const M = computeFrameCount(N, L, H);
  const intervals: FrameInterval[] = [];
  for (let m = 0; m < M; m++) {
    intervals.push(computeFrameInterval(m, L, H));
  }
  return intervals;
}

/**
 * Maps a local frame index l to the global sample index g.
 * g = m * H + l
 */
export function localToGlobal(m: number, H: number, ell: number): number {
  return m * H + ell;
}

/**
 * Maps global sample index g to physical time t_g.
 * t_g = g / f_s
 */
export function globalIndexToTime(g: number, fs: number): number {
  return g / fs;
}

/**
 * Frame interval boundary details: start, endExclusive, and lastSampleTime
 */
export function frameTimeInterval(m: number, L: number, H: number, fs: number) {
  const startIdx = m * H;
  const endExclIdx = startIdx + L;
  const lastSampleIdx = startIdx + L - 1;
  return {
    start: startIdx / fs,
    endExclusive: endExclIdx / fs,
    lastSampleTime: lastSampleIdx / fs,
  };
}

export interface LabState {
  fs: number;
  N: number;
  L: number;
  H: number;
  M: number;
  selectedFrameM: number;
  selectedEll: number;
  signalValues: number[];
  frameStarts: number[];
  frameIntervals: FrameInterval[];
  selectedFrame: FrameInterval;
  selectedGlobalIndex: number;
  selectedSampleValue: number;
  timeAxis: number[];
  selectedFrameTimeInterval: {
    start: number;
    endExclusive: number;
    lastSampleTime: number;
  };
  windowValues: number[];
  selectedLocalFrameValues: number[];
  windowedValues: number[];
  coherentGain: number;
  signalSourceKind: 'analytic' | 'discrete_only' | 'interpolation_guide';
  samplingDisplayMode: 'index_view' | 'physical_time_view';
  sampleCountMode: 'fixed_N' | 'fixed_duration';
  T_total: number;
  allowGapMode?: boolean;
}

export function deriveLabState(config: {
  isSmallDemo: boolean;
  fs: number;
  N: number;
  L: number;
  H: number;
  selectedFrameM: number;
  selectedEll: number;
  signalType: SignalType;
  signalSourceKind: 'analytic' | 'discrete_only' | 'interpolation_guide';
  windowType: 'rectangular' | 'hann' | 'custom-bartlett';
  seed: number;
  samplingDisplayMode?: 'index_view' | 'physical_time_view';
  sampleCountMode?: 'fixed_N' | 'fixed_duration';
  T_total?: number;
  allowGapMode?: boolean;
}): LabState {
  let sampleCountMode = config.sampleCountMode ?? 'fixed_N';
  let samplingDisplayMode = config.samplingDisplayMode ?? 'index_view';
  let T_total = config.T_total ?? 1.0;

  if (config.isSmallDemo) {
    sampleCountMode = 'fixed_N';
    samplingDisplayMode = 'index_view';
    T_total = 1.0;
  }

  // Preserve raw fs (do not clamp to Math.max(1, ...) silently)
  let fs = config.isSmallDemo ? 16 : config.fs;
  
  let N = computeSampleCount({
    sampleCountMode,
    T_total,
    fs,
    N: config.N
  });

  if (config.isSmallDemo) {
    N = 16;
  }

  // Ensure safe N for array allocations to avoid crashes, while preserving N for state.
  const safeN0 = Math.max(1, N);

  let L = config.isSmallDemo ? 4 : Math.max(1, Math.round(config.L));
  let H = config.isSmallDemo ? 4 : Math.max(1, Math.round(config.H));

  // Generate signal source
  let signalSourceKind = config.signalSourceKind;
  let signalValues: number[];
  if (config.isSmallDemo) {
    signalSourceKind = 'discrete_only';
  }
  signalValues = makeSignalValues({
    isSmallDemo: config.isSmallDemo,
    signalSourceKind,
    signalType: config.signalType,
    fs,
    seed: config.seed
  }, safeN0);

  const M = computeFrameCount(safeN0, L, H);
  const frameStarts = computeFrameStarts(M, H);
  const frameIntervals = computeAllFrameIntervals(safeN0, L, H);

  let selectedFrameM = config.selectedFrameM;
  if (M > 0) {
    selectedFrameM = Math.max(0, Math.min(selectedFrameM, M - 1));
  } else {
    selectedFrameM = 0;
  }

  let selectedEll = config.selectedEll;
  selectedEll = Math.max(0, Math.min(selectedEll, L - 1));

  // Get selected frame interval details
  const selectedFrame = computeFrameInterval(selectedFrameM, L, H);

  const selectedGlobalIndex = Math.max(0, Math.min(localToGlobal(selectedFrameM, H, selectedEll), safeN0 - 1));
  const selectedSampleValue = signalValues[selectedGlobalIndex] ?? 0;

  const timeAxis: number[] = [];
  for (let g = 0; g < safeN0; g++) {
    timeAxis.push(globalIndexToTime(g, fs));
  }

  const selectedFrameTimeInterval = frameTimeInterval(selectedFrameM, L, H, fs);

  const windowValues = makeWindow(config.windowType, L);

  const selectedLocalFrameValues: number[] = [];
  for (let ell = 0; ell < L; ell++) {
    const absG = localToGlobal(selectedFrameM, H, ell);
    selectedLocalFrameValues.push(absG < safeN0 ? signalValues[absG] : 0.0);
  }

  const windowedValues = applyWindow(selectedLocalFrameValues, windowValues);
  const cg = coherentGain(windowValues);

  return {
    fs,
    N,
    L,
    H,
    M,
    selectedFrameM,
    selectedEll,
    signalValues,
    frameStarts,
    frameIntervals,
    selectedFrame,
    selectedGlobalIndex,
    selectedSampleValue,
    timeAxis,
    selectedFrameTimeInterval,
    windowValues,
    selectedLocalFrameValues,
    windowedValues,
    coherentGain: cg,
    signalSourceKind,
    samplingDisplayMode,
    sampleCountMode,
    T_total,
    allowGapMode: config.allowGapMode ?? false,
  };
}
