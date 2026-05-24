/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WindowType = 'rectangular' | 'hann' | 'custom-bartlett';

/**
 * Generates window weights w[l] for l = 0..L-1.
 * Standardizes rectangular, Hann, and custom-bartlett/triangular windows.
 */
export function makeWindow(type: WindowType, L: number): number[] {
  const w: number[] = [];
  if (L <= 0) return w;
  
  if (type === 'rectangular') {
    for (let l = 0; l < L; l++) {
      w.push(1.0);
    }
  } else if (type === 'hann') {
    for (let l = 0; l < L; l++) {
      // Periodic Hann: 0.5 * (1 - cos(2 * PI * l / L))
      w.push(0.5 * (1 - Math.cos((2 * Math.PI * l) / L)));
    }
  } else if (type === 'custom-bartlett') {
    // Triangular / Bartlett window
    // Formula: 1 - |(l - (L-1)/2) / ((L-1)/2)| if L > 1
    if (L === 1) {
      w.push(1.0);
    } else {
      const halfL = (L - 1) / 2;
      for (let l = 0; l < L; l++) {
        const weight = 1.0 - Math.abs((l - halfL) / halfL);
        w.push(weight);
      }
    }
  }

  return w;
}

/**
 * Computes windowed local frame: x_tilde^(m)[l] = x^(m)[l] * w[l]
 */
export function applyWindow(frame: number[], window: number[]): number[] {
  const L = frame.length;
  const result: number[] = [];
  for (let l = 0; l < L; l++) {
    result.push(frame[l] * (window[l] ?? 1.0));
  }
  return result;
}

/**
 * Computes the coherent gain of a window: CG_w = (1/L) * sum_{l=0}^{L-1} w[l]
 */
export function coherentGain(window: number[]): number {
  const L = window.length;
  if (L <= 0) return 0;
  const sum = window.reduce((acc, val) => acc + val, 0);
  return sum / L;
}
