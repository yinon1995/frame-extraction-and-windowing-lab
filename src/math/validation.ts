/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ValidationSeverity = "error" | "warning" | "info";

export interface MathValidationIssue {
  id: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  formula?: string;
  affectedFields: string[];
  suggestedFix?: string;
}

export function validateLabConfig(config: any, derivedState: any): MathValidationIssue[] {
  const issues: MathValidationIssue[] = [];

  const rawFs = config.fs;
  const rawL = config.L;
  const rawH = config.H;
  const rawN = config.N;

  const derivedFs = derivedState?.fs ?? rawFs;
  const derivedL = derivedState?.L ?? rawL;
  const derivedH = derivedState?.H ?? rawH;
  const derivedN = derivedState?.N ?? rawN;
  const derivedM = derivedState?.M ?? 0;

  const allowGapMode = config.allowGapMode ?? false;

  // --- A. Invalid numeric inputs ---

  // 1. Sampling frequency invalid
  if (typeof rawFs !== 'number' || rawFs <= 0 || !isFinite(rawFs)) {
    issues.push({
      id: "fs-invalid",
      severity: "error",
      title: "Invalid Sampling Frequency",
      message: "Sampling frequency must be positive. Physical time is defined by t_g = g / f_s, so f_s cannot be zero or negative.",
      formula: "t_g = \\frac{g}{f_s}",
      affectedFields: ["fs"],
      suggestedFix: "Choose f_s > 0."
    });
  }

  // 2. Frame length invalid
  if (typeof rawL !== 'number' || rawL <= 0 || !Number.isInteger(rawL)) {
    issues.push({
      id: "L-invalid",
      severity: "error",
      title: "Invalid Frame Length",
      message: "Frame length L must be a positive integer because each frame must contain a positive number of samples.",
      affectedFields: ["L"],
      suggestedFix: "Choose L ≥ 1."
    });
  }

  // 3. Hop size invalid
  if (typeof rawH !== 'number' || rawH <= 0 || !Number.isInteger(rawH)) {
    issues.push({
      id: "H-invalid",
      severity: "error",
      title: "Invalid Hop Size",
      message: "Hop size H must be a positive integer. If H = 0, all frames start at the same place and the frame sequence does not advance.",
      formula: "s_m = mH",
      affectedFields: ["H"],
      suggestedFix: "Choose H ≥ 1."
    });
  }

  // 4. Sample count invalid
  if (typeof rawN !== 'number' || rawN <= 0 || !Number.isInteger(rawN)) {
    issues.push({
      id: "N-invalid",
      severity: "error",
      title: "Invalid Sample Count",
      message: "The signal must contain at least one sample. The global index set is {0, ..., N-1}, so N must be positive.",
      affectedFields: ["N"],
      suggestedFix: "Choose N ≥ 1."
    });
  }

  // If there are raw numeric errors, we don't proceed with further compound constraints
  if (issues.some(i => i.severity === "error")) {
    return issues;
  }

  // --- B. Frame extraction constraints ---

  // 5. Frame longer than signal
  // Condition: rawL > rawN or derivedL > derivedN (if derivedState is clamped)
  if (rawL > rawN || derivedL > derivedN) {
    issues.push({
      id: "L-greater-than-N",
      severity: "error",
      title: "Frame Length Exceeds Signal Size",
      message: "Frame length L is larger than the signal length N. No complete frame can be extracted.",
      formula: "s_m + L \\le N",
      affectedFields: ["L", "N"],
      suggestedFix: "Reduce L or increase N."
    });
  }

  // 15. Derived N too small (another perspective for derived count)
  if (derivedN < derivedL) {
    issues.push({
      id: "derived-N-too-small",
      severity: "error",
      title: "Sample Count Smaller than Frame Size",
      message: "The derived sample count N is smaller than frame length L, so no complete frame can be extracted.",
      affectedFields: ["N", "L"]
    });
  }

  // 6. No valid complete frames
  if (derivedM === 0) {
    issues.push({
      id: "no-valid-frames",
      severity: "error",
      title: "No Valid Complete Frames",
      message: "No complete valid frame exists under the current settings.",
      formula: "M = \\left\\lfloor \\frac{N-L}{H} \\right\\rfloor + 1",
      affectedFields: ["L", "H", "N"],
      suggestedFix: "Use L ≤ N and H ≥ 1."
    });
  }

  // 7, 8, 9. Hop size vs Frame length (gaps vs overlap vs non-overlap)
  if (rawH > rawL) {
    if (!allowGapMode) {
      issues.push({
        id: "H-greater-than-L-strict",
        severity: "error",
        title: "Gap Error: Hop Size exceeds Frame Length",
        message: "Hop size H is larger than frame length L. This creates gaps: some global samples are skipped and do not belong to any frame.",
        formula: "H > L \\Rightarrow \\text{gaps between frames}",
        affectedFields: ["H", "L"],
        suggestedFix: "Set H = L for non-overlapping frames, H < L for overlapping frames, or toggle 'Allow gap mode H > L' in Advanced Parameters."
      });
    } else {
      issues.push({
        id: "H-greater-than-L-warn",
        severity: "warning",
        title: "Gaps Created between Frames",
        message: "Hop size H is larger than frame length L. This creates gaps: some global samples are skipped and do not belong to any frame.",
        formula: "H > L \\Rightarrow \\text{gaps between frames}",
        affectedFields: ["H", "L"],
        suggestedFix: "Use H = L for non-overlapping frames, or H < L for overlapping frames."
      });
    }
  } else if (rawH === rawL) {
    issues.push({
      id: "H-equals-L-info",
      severity: "info",
      title: "Non-overlapping Frames",
      message: "Non-overlapping frames: each complete frame starts exactly where the previous frame ends.",
      formula: "H = L",
      affectedFields: ["H", "L"]
    });
  } else if (rawH < rawL) {
    issues.push({
      id: "H-less-than-L-warn",
      severity: "warning",
      title: "Frame Overlap Enabled",
      message: "Overlap enabled: some global samples appear in more than one frame. This is valid, but later aggregation must define how repeated samples are handled.",
      formula: "H < L \\Rightarrow \\text{overlap}",
      affectedFields: ["H", "L"],
      suggestedFix: "Use H = L for the simplest baseline."
    });
  }

  // --- C. Selected index constraints ---

  // 10. Selected frame out of range
  if (config.selectedFrameM !== undefined && (config.selectedFrameM < 0 || config.selectedFrameM >= derivedM) && derivedM > 0) {
    issues.push({
      id: "selected-frame-out-of-range",
      severity: "warning",
      title: "Selected Frame Clamped",
      message: "Selected frame m is outside the valid frame set and was clamped.",
      formula: "m \\in \\{0,\\ldots,M-1\\}",
      affectedFields: ["selectedFrameM"],
      suggestedFix: "Choose a valid m."
    });
  }

  // 11. Selected local index out of range
  if (config.selectedEll !== undefined && (config.selectedEll < 0 || config.selectedEll >= derivedL)) {
    issues.push({
      id: "selected-ell-out-of-range",
      severity: "warning",
      title: "Selected Local Index Out of Range",
      message: "Selected local index ℓ must lie inside the selected frame.",
      formula: "\\ell \\in \\{0,\\ldots,L-1\\}",
      affectedFields: ["selectedEll"],
      suggestedFix: "Choose 0 ≤ ℓ < L."
    });
  }

  // --- D. Sampling model / mode confusion ---

  // 12. Fixed-N mode confusion
  if (config.sampleCountMode === "fixed_N") {
    issues.push({
      id: "fixed-N-info",
      severity: "info",
      title: "Fixed-N mode enabled",
      message: "Fixed-N mode: changing f_s changes physical-time labels and observed duration, but not the number of samples.",
      formula: "T_{\\mathrm{observed}} = \\frac{N}{f_s}",
      affectedFields: ["sampleCountMode"]
    });
  }

  // 13. Fixed-duration mode
  if (config.sampleCountMode === "fixed_duration") {
    issues.push({
      id: "fixed-duration-info",
      severity: "info",
      title: "Fixed-duration mode enabled",
      message: "Fixed-duration mode: changing f_s changes the number of samples.",
      formula: "N = \\lfloor T_{\\mathrm{total}} f_s \\rfloor",
      affectedFields: ["sampleCountMode"]
    });
  }

  // 14. Derived N too large
  if (derivedN > 512) {
    issues.push({
      id: "N-too-large",
      severity: "warning",
      title: "High Sample Density Warning",
      message: "The current settings generate many samples. The diagram may become dense and harder to read.",
      affectedFields: ["N", "fs", "T_total"],
      suggestedFix: "Reduce f_s or T_total, or use zoom/expanded mode."
    });
  }

  // --- E. Continuous source / interpolation honesty ---

  // 16. Interpolation guide is not a true continuous source
  if (config.signalSourceKind === "interpolation_guide" && config.showContinuousSource === true) {
    issues.push({
      id: "interpolation-guide-info",
      severity: "info",
      title: "Interpolation Guide Disclaimer",
      message: "This curve only connects discrete values. It is not the unique original continuous signal.",
      affectedFields: ["signalSourceKind", "showContinuousSource"]
    });
  }

  // 17. Discrete-only mode
  if (config.signalSourceKind === "discrete_only") {
    issues.push({
      id: "discrete-only-info",
      severity: "info",
      title: "Discrete-only mode",
      message: "Discrete-only mode: values are generated directly as samples. They are not resampled from a known continuous source.",
      affectedFields: ["signalSourceKind"]
    });
  }

  // 18. Analytic source Nyquist warning
  if (config.signalSourceKind === "analytic" && derivedFs < 14) {
    issues.push({
      id: "nyquist-warning",
      severity: "warning",
      title: "Sub-Nyquist Sampling Warning",
      message: "Sampling below Nyquist for this analytic source. The source contains frequencies up to 7 Hz, so the Nyquist condition is f_s ≥ 14 Hz.",
      formula: "f_s \\ge 2f_{\\max}",
      affectedFields: ["fs", "signalSourceKind"],
      suggestedFix: "Use f_s ≥ 14 Hz."
    });
  }

  // --- F. Windowing constraints ---

  // 19. Window length mismatch
  if (derivedState?.windowValues && derivedState?.windowValues.length !== derivedL) {
    issues.push({
      id: "window-length-mismatch",
      severity: "error",
      title: "Window Length Mismatch",
      message: "Window vector length must match frame length L. Windowing is pointwise multiplication.",
      formula: "\\tilde{x}^{(m)}[\\ell] = x^{(m)}[\\ell]w[\\ell]",
      affectedFields: ["L", "windowType"]
    });
  }

  // 20. Coherent gain invalid
  if (derivedState?.coherentGain !== undefined && (derivedState.coherentGain <= 0 || !isFinite(derivedState.coherentGain))) {
    issues.push({
      id: "coherent-gain-invalid",
      severity: "error",
      title: "Invalid Coherent Gain",
      message: "Coherent gain must be positive for amplitude calibration. A zero coherent gain would make amplitude normalization undefined.",
      formula: "CG_w = \\frac{1}{L}\\sum_{\\ell=0}^{L-1}w[\\ell]",
      affectedFields: ["windowType", "L"]
    });
  }

  return issues;
}
