import { describe, test, expect } from 'vitest';
import {
  computeFrameCount,
  computeFrameStarts,
  computeFrameInterval,
  localToGlobal,
  globalIndexToTime,
  frameTimeInterval,
  deriveLabState,
} from '../math/framing';
import { makeSmallDemoSignal, makeSignal, evaluateSmoothDeterministicXC } from '../math/signal';
import { makeWindow, applyWindow, coherentGain } from '../math/window';
import { validateLabConfig } from '../math/validation';

describe('Frame Extraction & Windowing Lab — Mathematical & Integration Audit Tests', () => {

  // ==========================================
  // REQUIREMENT 1: fixed_duration N computes floor(T_total * fs)
  // ==========================================
  test('Requirement 1: fixed_duration mode calculates N = floor(T_total * fs) for all source kinds', () => {
    const sourceKinds = ['analytic', 'discrete_only', 'interpolation_guide'] as const;
    sourceKinds.forEach((sourceKind) => {
      const state = deriveLabState({
        isSmallDemo: false,
        fs: 25,
        N: 100, // should be overridden
        L: 4,
        H: 4,
        selectedFrameM: 0,
        selectedEll: 0,
        signalType: 'sine',
        signalSourceKind: sourceKind,
        windowType: 'rectangular',
        seed: 123,
        sampleCountMode: 'fixed_duration',
        T_total: 1.6,
      });
      // expected N = floor(1.6 * 25) = 40
      expect(state.N).toBe(40);
      expect(state.signalValues.length).toBe(40);
    });
  });

  // ==========================================
  // REQUIREMENT 2: fixed_N mode N stays unchanged for all source kinds when fs changes
  // ==========================================
  test('Requirement 2: fixed_N mode keeps N unchanged for all source kinds when fs changes', () => {
    const sourceKinds = ['analytic', 'discrete_only', 'interpolation_guide'] as const;
    const frequencies = [10, 25, 100];
    sourceKinds.forEach((sourceKind) => {
      frequencies.forEach((fs) => {
        const state = deriveLabState({
          isSmallDemo: false,
          fs: fs,
          N: 48, // N must stay exactly 48
          L: 4,
          H: 4,
          selectedFrameM: 0,
          selectedEll: 0,
          signalType: 'sine',
          signalSourceKind: sourceKind,
          windowType: 'rectangular',
          seed: 42,
          sampleCountMode: 'fixed_N',
        });
        expect(state.N).toBe(48);
        expect(state.signalValues.length).toBe(48);
      });
    });
  });

  // ==========================================
  // REQUIREMENT 3: analytic xc resampling
  // ==========================================
  test('Requirement 3: analytic mode resamples continuous function x[g] = xc(g/fs)', () => {
    const fs = 32;
    const N = 20;
    const state = deriveLabState({
      isSmallDemo: false,
      fs,
      N,
      L: 4,
      H: 4,
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine', // Should be ignored in analytic source kind
      signalSourceKind: 'analytic',
      windowType: 'rectangular',
      seed: 42,
      sampleCountMode: 'fixed_N',
    });

    for (let g = 0; g < N; g++) {
      const expectedValue = evaluateSmoothDeterministicXC(g / fs);
      expect(state.signalValues[g]).toBeCloseTo(expectedValue, 6);
    }
  });

  // ==========================================
  // REQUIREMENT 4: discrete_only values independence
  // ==========================================
  test('Requirement 4: discrete_only mode changes fs in fixed_N mode without changing signalValues', () => {
    const config1 = {
      isSmallDemo: false,
      fs: 16,
      N: 16,
      L: 4,
      H: 4,
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine' as const,
      signalSourceKind: 'discrete_only' as const,
      windowType: 'rectangular' as const,
      seed: 99,
      sampleCountMode: 'fixed_N' as const,
    };

    const state1 = deriveLabState(config1);
    const state2 = deriveLabState({ ...config1, fs: 50 });

    for (let g = 0; g < 16; g++) {
      expect(state1.signalValues[g]).toBe(state2.signalValues[g]);
    }
  });

  // ==========================================
  // REQUIREMENT 5: interpolation_guide mode properties
  // ==========================================
  test('Requirement 5: interpolation_guide mode does not characterize itself as continuous source', () => {
    // Under interpolation_guide mode, validateLabConfig raises a specific disclaimer/info item
    const config = {
      isSmallDemo: false,
      fs: 16,
      N: 16,
      L: 4,
      H: 4,
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine' as const,
      signalSourceKind: 'interpolation_guide' as const,
      windowType: 'rectangular' as const,
      seed: 42,
      showContinuousSource: true,
    };
    const state = deriveLabState(config);
    const issues = validateLabConfig(config, state);
    const discIssue = issues.find(i => i.id === 'interpolation-guide-info');
    expect(discIssue).toBeDefined();
    expect(discIssue?.message).toContain('only connects discrete values');
  });

  // ==========================================
  // REQUIREMENT 6: H > L with allowGapMode = false triggers blocking error
  // ==========================================
  test('Requirement 6: H > L with allowGapMode = false triggers blocking mathematical error', () => {
    const config = {
      isSmallDemo: false,
      fs: 16,
      N: 32,
      L: 4,
      H: 8, // H > L
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine' as const,
      signalSourceKind: 'discrete_only' as const,
      windowType: 'rectangular' as const,
      seed: 42,
      allowGapMode: false,
    };
    const state = deriveLabState(config);
    const issues = validateLabConfig(config, state);
    const errorIssue = issues.find(i => i.id === 'H-greater-than-L-strict');
    expect(errorIssue).toBeDefined();
    expect(errorIssue?.severity).toBe('error');
  });

  // ==========================================
  // REQUIREMENT 7: H > L with allowGapMode = true triggers warning
  // ==========================================
  test('Requirement 7: H > L with allowGapMode = true results in warning rather than error', () => {
    const config = {
      isSmallDemo: false,
      fs: 16,
      N: 32,
      L: 4,
      H: 8, // H > L
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine' as const,
      signalSourceKind: 'discrete_only' as const,
      windowType: 'rectangular' as const,
      seed: 42,
      allowGapMode: true,
    };
    const state = deriveLabState(config);
    const issues = validateLabConfig(config, state);
    const warningIssue = issues.find(i => i.id === 'H-greater-than-L-warn');
    expect(warningIssue).toBeDefined();
    expect(warningIssue?.severity).toBe('warning');
    // Ensure no severe strict gap error is generated
    expect(issues.some(i => i.id === 'H-greater-than-L-strict')).toBe(false);
  });

  // ==========================================
  // REQUIREMENT 8: L > N triggers blocking error
  // ==========================================
  test('Requirement 8: L > N triggers blocking mathematical error', () => {
    const config = {
      isSmallDemo: false,
      fs: 16,
      N: 10,
      L: 12, // L > N
      H: 4,
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine' as const,
      signalSourceKind: 'discrete_only' as const,
      windowType: 'rectangular' as const,
      seed: 42,
    };
    const state = deriveLabState(config);
    const issues = validateLabConfig(config, state);
    const lError = issues.find(i => i.id === 'L-greater-than-N');
    expect(lError).toBeDefined();
    expect(lError?.severity).toBe('error');
  });

  // ==========================================
  // REQUIREMENT 9: fixed_duration derives N < L triggers blocking error
  // ==========================================
  test('Requirement 9: fixed_duration resulting in N < L triggers blocking error', () => {
    const config = {
      isSmallDemo: false,
      fs: 10,
      N: 100, // ignored
      L: 8, // frame size L=8
      H: 4,
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine' as const,
      signalSourceKind: 'discrete_only' as const,
      windowType: 'rectangular' as const,
      seed: 42,
      sampleCountMode: 'fixed_duration' as const,
      T_total: 0.5, // N = floor(0.5 * 10) = 5
    };
    const state = deriveLabState(config);
    expect(state.N).toBe(5); // N < L indeed
    const issues = validateLabConfig(config, state);
    const errorIssue = issues.find(i => i.id === 'derived-N-too-small' || i.id === 'L-greater-than-N');
    expect(errorIssue).toBeDefined();
    expect(errorIssue?.severity).toBe('error');
  });

  // ==========================================
  // REQUIREMENT 10: No sample x[N] appears
  // ==========================================
  test('Requirement 10: no sample x[N] appears in discrete buffers (indexed 0 to N-1)', () => {
    const state = deriveLabState({
      isSmallDemo: false,
      fs: 16,
      N: 16,
      L: 4,
      H: 4,
      selectedFrameM: 0,
      selectedEll: 0,
      signalType: 'sine',
      signalSourceKind: 'discrete_only',
      windowType: 'rectangular',
      seed: 42,
    });
    expect(state.signalValues.length).toBe(16);
    expect(state.signalValues[16]).toBeUndefined();
    
    // Check all compute frame intervals bound endExcl to <= 16
    state.frameIntervals.forEach((interval) => {
      expect(interval.endExcl).toBeLessThanOrEqual(16);
      interval.indices.forEach((g) => {
        expect(g).toBeLessThan(16);
      });
    });
  });

  // ==========================================
  // REQUIREMENT 11: Index Clamping Safety
  // ==========================================
  test('Requirement 11: selected frame and local ell indexes clamp safely even with massive dimensions or zero frames', () => {
    const state = deriveLabState({
      isSmallDemo: false,
      fs: 16,
      N: 16,
      L: 8,
      H: 4,
      selectedFrameM: 100, // grossly out of bounds
      selectedEll: 50,     // grossly out of bounds
      signalType: 'sine',
      signalSourceKind: 'discrete_only',
      windowType: 'rectangular',
      seed: 42,
    });

    // M = floor((16 - 8)/4) + 1 = 3 frames (m=0, 1, 2)
    expect(state.M).toBe(3);
    expect(state.selectedFrameM).toBe(2); // clamped to M - 1
    expect(state.selectedEll).toBe(7);    // clamped to L - 1
  });

  // ==========================================
  // REQUIREMENT 12: Rectangular Window Invariants
  // ==========================================
  test('Requirement 12: rectangular window values are exactly 1.0, coherent gain equals 1.0', () => {
    const L = 6;
    const windowVals = makeWindow('rectangular', L);
    expect(windowVals.length).toBe(L);
    windowVals.forEach((w) => {
      expect(w).toBe(1.0);
    });

    const cg = coherentGain(windowVals);
    expect(cg).toBe(1.0);

    const testFrameValues = [0.1, -0.4, 0.8, 0.3, -0.5, 0.9];
    const windowed = applyWindow(testFrameValues, windowVals);
    expect(windowed).toEqual(testFrameValues);
  });

  // ==========================================
  // REQUIREMENT 13: Hann Window Invariants
  // ==========================================
  test('Requirement 13: periodic Hann window computes periodic samples, coherent gain is 0.5', () => {
    const L = 4;
    const hannWindow = makeWindow('hann', L);
    expect(hannWindow.length).toBe(L);
    expect(hannWindow[0]).toBeCloseTo(0, 6);
    expect(hannWindow[1]).toBeCloseTo(0.5, 6);
    expect(hannWindow[2]).toBeCloseTo(1.0, 6);
    expect(hannWindow[3]).toBeCloseTo(0.5, 6);

    const cg = coherentGain(hannWindow);
    expect(cg).toBe(0.5);

    const inputValues = [10.0, 20.0, 30.0, 40.0];
    const pointwiseWindowed = applyWindow(inputValues, hannWindow);
    expect(pointwiseWindowed[0]).toBeCloseTo(0, 6);
    expect(pointwiseWindowed[1]).toBeCloseTo(10.0, 6);
    expect(pointwiseWindowed[2]).toBeCloseTo(30.0, 6);
    expect(pointwiseWindowed[3]).toBeCloseTo(20.0, 6);
  });

  // ==========================================
  // REQUIREMENT 14: Step coordinate synchronization
  // ==========================================
  test('Requirement 14: step synchronization invariant works for Homework demo', () => {
    const state = deriveLabState({
      isSmallDemo: true, // Demowork mode baseline: N=16, L=4, H=4, fs=16, m=1, ell=0
      fs: 16,
      N: 16,
      L: 4,
      H: 4,
      selectedFrameM: 1,
      selectedEll: 0,
      signalType: 'sine',
      signalSourceKind: 'discrete_only',
      windowType: 'rectangular',
      seed: 42,
    });

    // Homework values:
    expect(state.N).toBe(16);
    expect(state.L).toBe(4);
    expect(state.H).toBe(4);
    expect(state.fs).toBe(16);
    expect(state.selectedFrameM).toBe(1);
    expect(state.selectedEll).toBe(0);

    // Coordinate conversion: g = mH + ell = 1*4 + 0 = 4
    expect(state.selectedGlobalIndex).toBe(4);

    // Verify raw signal values match textbook/homework baseline Demo x
    // x = [0.20, -0.55, 0.85, 0.35, -0.75, 0.60, -0.10, 0.95, ...]
    // x[4] should be -0.75
    expect(state.signalValues[4]).toBe(-0.75);
    expect(state.selectedSampleValue).toBe(-0.75);

    // Time: tg = g / fs = 4 / 16 = 0.25 s
    expect(state.timeAxis[4]).toBe(0.25);
    expect(state.selectedFrameTimeInterval.start).toBe(0.25); // Interval start: s_m / fs = 4 / 16 = 0.25
    expect(state.selectedFrameTimeInterval.endExclusive).toBe(0.50); // Interval endExcl: (s_m + L) / fs = 8 / 16 = 0.50

    // Frame indices match strictly: I_1 = {4, 5, 6, 7}
    expect(state.selectedFrame.indices).toEqual([4, 5, 6, 7]);

    // Local samples loaded correctly:
    expect(state.selectedLocalFrameValues).toEqual([-0.75, 0.60, -0.10, 0.95]);

    // Window coefficients for rectangular are all 1.0
    expect(state.windowValues).toEqual([1, 1, 1, 1]);
    expect(state.coherentGain).toBe(1.0);

    // Windowed pointwise outputs:
    expect(state.windowedValues).toEqual([-0.75, 0.60, -0.10, 0.95]);
  });
});
