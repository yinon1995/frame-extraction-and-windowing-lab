/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SignalType = 'deterministic-random' | 'sine' | 'multi-tone' | 'smooth-source';

/**
 * Generates a deterministic pseudorandom value using a Linear Congruential Generator.
 * Used to ensure that "random" signals are perfectly stable and controlled by a seed.
 */
function seededRandom(seedValue: number): () => number {
  const m = 0x80000000; // 2**31
  const a = 1103515245;
  const c = 12345;
  let state = seedValue ? seedValue : 42;
  return () => {
    state = (a * state + c) % m;
    return state / (m - 1);
  };
}

/**
 * Returns the small demo signal required by the guidelines:
 * x = [
 *   0.20, -0.55,  0.85,  0.35,
 *  -0.75,  0.60, -0.10,  0.95,
 *   0.40, -0.35, -0.90,  0.15,
 *   0.70, -0.20,  0.50, -0.65
 * ]
 */
export function makeSmallDemoSignal(): number[] {
  return [
     0.20, -0.55,  0.85,  0.35,
    -0.75,  0.60, -0.10,  0.95,
     0.40, -0.35, -0.90,  0.15,
     0.70, -0.20,  0.50, -0.65
  ];
}

/**
 * Evaluates the analytic smooth deterministic source signal at time t.
 */
export function evaluateSmoothDeterministicXC(t: number): number {
  const raw = 0.55 * Math.sin(2 * Math.PI * 2 * t) +
              0.30 * Math.sin(2 * Math.PI * 5 * t + 0.7) +
              0.15 * Math.cos(2 * Math.PI * 7 * t);
  return Math.max(-1, Math.min(1, raw));
}

/**
 * Creates discrete signal values x[g] for g = 0..N-1.
 */
export function makeSignal(
  type: SignalType,
  N: number,
  seed: number,
  fs: number = 16
): number[] {
  const signal: number[] = [];
  
  if (type === 'deterministic-random') {
    const rng = seededRandom(seed);
    for (let g = 0; g < N; g++) {
      // Map pseudo-random number in [0, 1] to [-0.8, 0.8] for a clean display
      signal.push(rng() * 1.6 - 0.8);
    }
  } else if (type === 'sine') {
    // We want about 1.5 completed cycles across N samples.
    const cycles = 1.5;
    for (let g = 0; g < N; g++) {
      signal.push(Math.sin((2 * Math.PI * cycles * g) / N));
    }
  } else if (type === 'multi-tone') {
    // Sum of two distinct frequencies across N samples
    const cycles1 = 1.2;
    const cycles2 = 3.6;
    for (let g = 0; g < N; g++) {
      const val = 0.6 * Math.sin((2 * Math.PI * cycles1 * g) / N) +
                  0.4 * Math.sin((2 * Math.PI * cycles2 * g) / N + Math.PI / 4);
      signal.push(val);
    }
  } else if (type === 'smooth-source') {
    for (let g = 0; g < N; g++) {
      const t = g / fs;
      signal.push(evaluateSmoothDeterministicXC(t));
    }
  }
  
  return signal;
}
