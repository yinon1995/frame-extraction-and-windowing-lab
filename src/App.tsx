/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, useMemo, useEffect } from 'react';
import {
  HelpCircle,
  Activity,
  BookOpen,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  X,
  Sliders,
} from 'lucide-react';

import {
  deriveLabState,
  computeFrameCount,
  LabState,
} from './math/framing';
import { SignalType } from './math/signal';

import { InlineMath, MathBlock, MathBadge } from './components/Math';
import { ActiveMappingCard } from './components/ActiveMappingCard';
import SignalAxis from './components/SignalAxis';
import { MathWalkthrough } from './components/MathWalkthrough';
import FrameIntervals from './components/FrameIntervals';
import LocalCoordinateMap from './components/LocalCoordinateMap';
import PhysicalTimeMap from './components/PhysicalTimeMap';
import WindowOperator from './components/WindowOperator';
import AppFooter from './components/AppFooter';

import { validateLabConfig, MathValidationIssue } from './math/validation';
import {
  MathValidationCenter,
  InlineFieldError,
  ToastContainer,
  ToastItem,
} from './components/MathValidationCenter';

export default function App() {
  // 1. Core State Toggles
  const [isSmallDemo, setIsSmallDemo] = useState(true);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(1); // Step 1 through 5
  const [isAdvCollapsed, setIsAdvCollapsed] = useState(true);

  // 2. Interactive Selection Focus parameters
  const [selectedFrameM, setSelectedFrameM] = useState<number>(1);
  const [selectedLocalIndexL, setSelectedLocalIndexL] = useState<number>(0);

  // 3. Advanced Custom Parameters
  const [advFs, setAdvFs] = useState<number>(16);
  const [advN, setAdvN] = useState<number>(16);
  const [advL, setAdvL] = useState<number>(4);
  const [advH, setAdvH] = useState<number>(4);
  const [signalType, setSignalType] = useState<SignalType>('deterministic-random');
  const [signalSourceKind, setSignalSourceKind] = useState<'analytic' | 'discrete_only' | 'interpolation_guide'>('discrete_only');
  const [windowType, setWindowType] = useState<'rectangular' | 'hann' | 'custom-bartlett'>('rectangular');
  const [noiseSeed, setNoiseSeed] = useState<number>(42);

  // New states for Physical-Time vs Index separation & Fixed Duration
  const [samplingDisplayMode, setSamplingDisplayMode] = useState<'index_view' | 'physical_time_view'>('index_view');
  const [sampleCountMode, setSampleCountMode] = useState<'fixed_N' | 'fixed_duration'>('fixed_N');
  const [T_total, setTTotal] = useState<number>(1.0);
  const [allowGapMode, setAllowGapMode] = useState<boolean>(false);

  // 4a. Playback Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackG, setPlaybackG] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<'slow' | 'normal' | 'fast' | 'step'>('slow');

  // 4b. Expanded View and Zoom state
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  // 4c. Continuous source rendering state
  const [showContinuousSource, setShowContinuousSource] = useState<boolean>(true);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  // Active validation toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastedIds, setToastedIds] = useState<Record<string, number>>({});

  // 5a. Prepare Raw Configuration (exactly what user entered)
  const rawConfig = useMemo(() => {
    return {
      isSmallDemo,
      fs: isSmallDemo ? 16 : advFs,
      N: isSmallDemo ? 16 : advN,
      L: isSmallDemo ? 4 : advL,
      H: isSmallDemo ? 4 : advH,
      selectedFrameM,
      selectedEll: selectedLocalIndexL,
      signalType: isSmallDemo ? 'deterministic-random' : signalType,
      signalSourceKind: isSmallDemo ? 'discrete_only' : signalSourceKind,
      windowType,
      seed: noiseSeed,
      samplingDisplayMode: isSmallDemo ? 'index_view' : samplingDisplayMode,
      sampleCountMode: isSmallDemo ? 'fixed_N' : sampleCountMode,
      T_total: isSmallDemo ? 1.0 : T_total,
      allowGapMode: isSmallDemo ? false : allowGapMode,
    };
  }, [
    isSmallDemo,
    advFs,
    advN,
    advL,
    advH,
    selectedFrameM,
    selectedLocalIndexL,
    signalType,
    signalSourceKind,
    windowType,
    noiseSeed,
    samplingDisplayMode,
    sampleCountMode,
    T_total,
    allowGapMode,
  ]);

  // 5b. Derive state cleanly using math helper
  const labState = useMemo<LabState>(() => {
    return deriveLabState(rawConfig);
  }, [rawConfig]);

  // 5c. Run centralized mathematical validations
  const validationIssues = useMemo<MathValidationIssue[]>(() => {
    const rawIssues = validateLabConfig(rawConfig, labState);
    const uniqueIssues: MathValidationIssue[] = [];
    const seenIds = new Set<string>();
    for (const issue of rawIssues) {
      if (!seenIds.has(issue.id)) {
        seenIds.add(issue.id);
        uniqueIssues.push(issue);
      }
    }
    return uniqueIssues;
  }, [rawConfig, labState]);

  // 5d. Handle triggering toast notification alerts
  useEffect(() => {
    if (isSmallDemo) return;

    const activeErrorsAndWarnings = validationIssues.filter(
      (issue) => issue.severity === 'error' || issue.severity === 'warning'
    );
    if (activeErrorsAndWarnings.length === 0) return;

    const now = Date.now();
    let updated = false;
    const nextToasted = { ...toastedIds };
    const addedToasts: ToastItem[] = [];

    activeErrorsAndWarnings.forEach((issue) => {
      const prevTime = toastedIds[issue.id];
      // 15 seconds threshold before potential re-toast of identical conditions
      if (!prevTime || now - prevTime > 15000) {
        updated = true;
        nextToasted[issue.id] = now;
        addedToasts.push({
          id: `${issue.id}-${now}-${Math.random()}`,
          issueId: issue.id,
          title: issue.title,
          message: issue.message,
          severity: issue.severity as "error" | "warning",
          formula: issue.formula,
          timestamp: now,
        });
      }
    });

    if (updated) {
      setToastedIds(nextToasted);
      setToasts((prev) => [...prev, ...addedToasts]);
    }
  }, [validationIssues, isSmallDemo]);

  // Automatically dismiss toasts after 8 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Timing queue for scanning animation loop
  useEffect(() => {
    if (!isPlaying || playbackSpeed === 'step') return;

    const intervalDurations = {
      slow: 1000,
      normal: 400,
      fast: 150,
      step: 0,
    };
    const duration = intervalDurations[playbackSpeed];

    const timer = setInterval(() => {
      setPlaybackG((prev) => {
        if (prev >= labState.N - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, duration);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, labState.N]);

  // Keep playback cursor bounded securely under mathematical parameters re-specification
  useEffect(() => {
    setIsPlaying(false);
    setPlaybackG((prev) => Math.min(prev, labState.N - 1));
  }, [labState.fs, labState.N, labState.L, labState.H, labState.selectedFrameM, labState.selectedEll]);

  // Escape key handler to close the controls drawer comfortably
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLeftDrawerOpen) {
        setIsLeftDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLeftDrawerOpen]);

  // Reset to textbook default parameters
  const handleReset = () => {
    setIsSmallDemo(true);
    setSelectedFrameM(1);
    setSelectedLocalIndexL(0);
    setWindowType('rectangular');
    setIsAdvCollapsed(true);
    setActiveTab(1);
    setIsPlaying(false);
    setPlaybackG(0);
    setPlaybackSpeed('slow');
    setIsExpanded(false);
    setZoom(1);
    setSignalSourceKind('discrete_only');
    setSamplingDisplayMode('index_view');
    setSampleCountMode('fixed_N');
    setTTotal(1.0);
  };

  const handleFsChange = (val: number) => {
    setAdvFs(val);
    setSelectedFrameM(0);
    setSelectedLocalIndexL(0);
  };

  const currentTabName = useMemo(() => {
    switch (activeTab) {
      case 1: return "Step 1 — Global Samples";
      case 2: return "Step 2 — Frame Extraction";
      case 3: return "Step 3 — Local Frame Coordinates";
      case 4: return "Step 4 — Physical Time Mapping";
      case 5: return "Step 5 — Window Operator";
      default: return "";
    }
  }, [activeTab]);

  const startIdx = labState.selectedFrameM * labState.H;
  const lastSampleIdx = startIdx + labState.L - 1;
  const boundaryIdx = startIdx + labState.L;

  const tStart = startIdx / labState.fs;
  const tLastSample = lastSampleIdx / labState.fs;
  const tBoundary = boundaryIdx / labState.fs;
  const tFrame = labState.L / labState.fs;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-12">
      {/* Top Academic Header Banner */}
      <header className="bg-white border-b border-slate-200 py-6 px-6 shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold tracking-wider font-mono">
                DSP Academic Textbook Unit
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Discrete-Time Frame Extraction & Windowing Lab
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Follow one signal from global samples to frame extraction, local coordinates, physical time, and windowing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isLeftDrawerOpen && (
              <button
                id="header-toggle-drawer-btn"
                onClick={() => setIsLeftDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-colors uppercase font-mono text-[10px] tracking-wide rounded-lg cursor-pointer"
                title="Open Lab Controls Drawer"
              >
                <Sliders size={12} />
                Show Lab Controls
              </button>
            )}
            <button
              id="reset-lab-btn"
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 font-semibold border border-slate-200 hover:bg-slate-200 transition-colors uppercase font-mono text-[10px] text-slate-700 tracking-wide rounded-lg cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset Lab Defaults
            </button>
          </div>
        </div>
      </header>

      {/* Collapsed tab/handle on the left side, always obvious and clickable */}
      {!isLeftDrawerOpen && (
        <button
          onClick={() => setIsLeftDrawerOpen(true)}
          className="fixed left-0 top-1/4 z-30 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-[11px] uppercase tracking-widest py-5 px-3 rounded-r-2xl shadow-xl transition-all hover:translate-x-1 cursor-pointer font-sans border border-l-0 border-blue-400 group h-40"
          id="drawer-open-btn"
          title="Open Lab Controls Drawer"
        >
          <Sliders className="h-4 w-4 animate-pulse group-hover:scale-115 transition-transform" />
          <span className="uppercase select-none tracking-widest font-black [writing-mode:vertical-lr] rotate-180">
            Lab Controls
          </span>
        </button>
      )}

      {/* Main Layout Flex Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-6 flex flex-col lg:flex-row gap-6 items-start relative">
        
        {/* Left Side Backdrop for tablet/mobile overlays */}
        {isLeftDrawerOpen && (
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-3xs z-35 lg:hidden cursor-pointer"
            onClick={() => setIsLeftDrawerOpen(false)}
            id="drawer-backdrop"
          />
        )}

        {/* Persistent Left-side Control Drawer */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 p-5 shadow-2xl space-y-4
          w-full sm:w-[400px] h-full overflow-y-auto flex flex-col shrink-0
          lg:relative lg:inset-auto lg:z-0 lg:border lg:rounded-xl lg:shadow-xs lg:w-[390px] lg:h-auto lg:max-h-[calc(100vh-140px)] lg:sticky lg:top-6 lg:overflow-y-auto
          transition-all duration-300 ease-in-out transform
          ${isLeftDrawerOpen 
            ? 'translate-x-0 opacity-100 block' 
            : '-translate-x-full opacity-0 pointer-events-none hidden lg:hidden'
          }
        `}>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0 mb-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-sans leading-none">
                  Lab Controls
                </h2>
                <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">
                  Persistent across all steps
                </p>
              </div>
            </div>
            <button
              type="button"
              id="drawer-close-btn"
              onClick={() => setIsLeftDrawerOpen(false)}
              className="p-1 px-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer text-[10px] font-bold uppercase font-mono tracking-wide"
              title="Close Lab Controls (Esc)"
            >
              Close ✕
            </button>
          </div>

          {/* Drawer Internal Content Scroll Context */}
          <div className="space-y-4 flex-1 overflow-y-auto pr-0.5 min-h-0">
          
          {/* Classroom Setup Mode Selector Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase font-sans">
                  Classroom Setup Mode
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="setup-mode-homework-btn"
                onClick={() => {
                  setIsSmallDemo(true);
                  setSampleCountMode('fixed_N');
                  setSamplingDisplayMode('index_view');
                  setAdvFs(16);
                  setAdvN(16);
                  setSelectedFrameM(1);
                  setSelectedLocalIndexL(0);
                }}
                className={`py-2 px-1 border rounded-lg font-bold text-xs text-center transition-all cursor-pointer ${
                  isSmallDemo
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200'
                }`}
              >
                Homework (N=16)
              </button>
              <button
                id="setup-mode-custom-btn"
                onClick={() => {
                  setIsSmallDemo(false);
                  setSampleCountMode('fixed_duration');
                  setSamplingDisplayMode('physical_time_view');
                  setTTotal(1.0);
                  setAdvFs(16);
                  setSelectedFrameM(0);
                  setSelectedLocalIndexL(0);
                }}
                className={`py-2 px-1 border rounded-lg font-bold text-xs text-center transition-all cursor-pointer ${
                  !isSmallDemo
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200'
                }`}
              >
                Custom Mode
              </button>
            </div>

            {isSmallDemo ? (
              <p className="text-[11px] text-slate-500 italic leading-relaxed font-sans bg-amber-50 border border-amber-105 p-2.5 rounded-lg">
                Homework mode is preset to the textbook checkpoint: <InlineMath math="N=16" />, <InlineMath math="f_s=16" /> Hz, index_view. Select "Custom Mode" to unlock full sampling-rate controls.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-800 font-sans bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg leading-relaxed">
                ✓ <strong>Custom Mode unlocked:</strong> Explore physical timing equations, continuous resampling rates, and custom windowing bounds interactively.
              </p>
            )}
          </div>

          {/* Collapsible Central Validation Panel with Interactive Alerts */}
          <MathValidationCenter issues={validationIssues} />

          {/* Core Interactive Selection Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Activity size={14} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase font-sans">
                Selection Focus
              </h3>
            </div>

            {/* Selected Frame slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 font-sans flex items-center gap-1.5">
                  <span>Frame index</span>
                  <InlineMath math="m" className="text-slate-500" />
                </span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                  <InlineMath math={`m = ${labState.selectedFrameM}`} />
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, labState.M - 1)}
                value={labState.selectedFrameM}
                onChange={(e) => {
                  setSelectedFrameM(Number(e.target.value));
                  setSelectedLocalIndexL(0);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span className="whitespace-nowrap inline-flex items-center">
                  <InlineMath math={`s_m = ${labState.selectedFrameM * labState.H}`} className="text-slate-400" />
                </span>
                <span className="whitespace-nowrap inline-flex items-center">
                  <InlineMath math={`\\text{Limit } M = ${labState.M}`} className="text-slate-400" />
                </span>
              </div>
            </div>

            {/* Selected Local Offset slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 font-sans">
                  Local offset ℓ
                </span>
                <span className="font-mono font-bold text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                  <InlineMath math={`\\ell = ${labState.selectedEll}`} />
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, labState.L - 1)}
                value={labState.selectedEll}
                onChange={(e) => setSelectedLocalIndexL(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span className="whitespace-nowrap inline-flex items-center">
                  <InlineMath math="\\text{Offset } 0" className="text-slate-400" />
                </span>
                <span className="whitespace-nowrap inline-flex items-center">
                  <InlineMath math={`\\text{Limit } L = ${labState.L}`} className="text-slate-400" />
                </span>
              </div>
            </div>

            {/* Window Type Picker */}
            <div className="space-y-1.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 font-sans block">
                  Window operator
                </label>
                <div className="drawer-math-box rounded-md bg-slate-50 border border-slate-200 px-2.5 py-2 flex items-center justify-center min-h-[36px]">
                  <InlineMath
                    math={"w[\\ell]"}
                    className="drawer-math-display text-xs text-slate-600 font-bold"
                  />
                </div>
              </div>
              <select
                value={windowType}
                onChange={(e) => setWindowType(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer focus:ring-1 focus:ring-blue-400 focus:outline-none"
              >
                <option value="rectangular">Rectangular (Flat Unit Weight)</option>
                <option value="hann">Hann (Raised Cosine)</option>
                <option value="custom-bartlett">Bartlett (Triangular Envelope)</option>
              </select>
            </div>
          </div>

          {/* Persistent Dynamic Active Mapping Readout */}
          <ActiveMappingCard labState={labState} />

          {/* Visible Controls Block when in Custom Setup Mode */}
          {!isSmallDemo && (
            <div className="space-y-4">
              {/* Sampling Rate */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block font-sans">
                    1. Sampling Frequency
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">
                    f_s = {advFs} Hz
                  </span>
                </div>
                
                {/* Numeric Input & Slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={advFs}
                    onChange={(e) => {
                      const text = e.target.value;
                      const val = text === '' ? NaN : Number(text);
                      handleFsChange(val);
                    }}
                    className="w-16 p-1.5 bg-white border border-slate-250 rounded font-mono text-center text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                  />
                  <input
                    type="range"
                    min="4"
                    max="256"
                    step="1"
                    value={isNaN(advFs) ? 16 : advFs}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleFsChange(val);
                    }}
                    className="flex-1 accent-blue-600 h-1.5 rounded cursor-pointer"
                  />
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {[8, 16, 32, 64, 77, 128].map((preset) => (
                    <button
                      key={`fs-preset-${preset}`}
                      onClick={() => handleFsChange(preset)}
                      className={`px-2 py-1 text-[10px] rounded border transition-all cursor-pointer font-semibold ${
                        advFs === preset
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {preset} Hz
                    </button>
                  ))}
                </div>

                <InlineFieldError issues={validationIssues} fieldName="fs" />
              </div>

              {/* Explicit Controls for Sample Count Mode & Display View */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block font-sans pb-1.5 border-b border-slate-100 mb-1">
                  2. Sampling & View Modes
                </label>
                
                {/* Sample Count Mode */}
                <div className="space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-600">Sample Count Mode:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="mode-fixed-duration-btn"
                      onClick={() => {
                        setSampleCountMode('fixed_duration');
                      }}
                      className={`py-1.5 px-2.5 border rounded-lg font-bold text-xs text-center transition-all cursor-pointer ${
                        sampleCountMode === 'fixed_duration'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200'
                      }`}
                    >
                      Fixed duration
                    </button>
                    <button
                      id="mode-fixed-n-btn"
                      onClick={() => {
                        setSampleCountMode('fixed_N');
                        setAdvN(labState.N);
                      }}
                      className={`py-1.5 px-2.5 border rounded-lg font-bold text-xs text-center transition-all cursor-pointer ${
                        sampleCountMode === 'fixed_N'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200'
                      }`}
                    >
                      Fixed N
                    </button>
                  </div>
                </div>

                {/* Display View */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10.5px] font-semibold text-slate-600">Display View:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="view-physical-time-btn"
                      onClick={() => setSamplingDisplayMode('physical_time_view')}
                      className={`py-1.5 px-2.5 border rounded-lg font-bold text-xs text-center transition-all cursor-pointer ${
                        samplingDisplayMode === 'physical_time_view'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200'
                      }`}
                    >
                      Physical time view
                    </button>
                    <button
                      id="view-index-btn"
                      onClick={() => setSamplingDisplayMode('index_view')}
                      className={`py-1.5 px-2.5 border rounded-lg font-bold text-xs text-center transition-all cursor-pointer ${
                        samplingDisplayMode === 'index_view'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-800 border-slate-200'
                      }`}
                    >
                      Index view
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Count Controller (T_total / N) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block font-sans">
                    3. Interval Specification
                  </label>
                </div>
                
                {sampleCountMode === 'fixed_duration' ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-655 flex items-center gap-1">
                        <span>Observation Duration</span>
                        <MathBadge math="T_{\mathrm{total}}" />
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={T_total}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setTTotal(val);
                            setSelectedFrameM(0);
                            setSelectedLocalIndexL(0);
                          }}
                          className="w-24 p-1.5 bg-white border border-slate-250 rounded font-mono text-center text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-semibold font-mono">seconds</span>
                      </div>
                    </div>
                    
                    <div className="p-2.5 bg-blue-50/70 border border-blue-150 rounded text-xs leading-normal font-sans text-slate-705">
                      <span className="font-bold text-blue-900 block mb-0.5">Derived sample count:</span>
                      <InlineMath math="N = \lfloor T_{\mathrm{total}} \cdot f_s \rfloor" />
                      <div className="font-mono mt-1 font-bold text-[11.5px] text-blue-600 bg-white/80 p-1 px-2.5 rounded border border-blue-100 mt-1 w-fit">
                        N = floor({T_total} · {advFs}) = {labState.N} samples
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-655 flex items-center gap-1">
                        <span>Signal Sequence Samples (N)</span>
                        <MathBadge math="N" />
                      </label>
                      <input
                        type="number"
                        value={advN}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAdvN(val);
                          setSelectedFrameM(0);
                          setSelectedLocalIndexL(0);
                        }}
                        className="w-full p-1.5 bg-white border border-slate-250 rounded font-mono text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                    </div>
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded text-[11px] leading-relaxed font-sans text-amber-900">
                      <span className="font-bold block mb-0.5">Fixed-N mode active:</span>
                      Changing <InlineMath math="f_s" /> changes timestamps and observed duration, not the number of samples.
                    </div>
                    <div className="p-2 bg-blue-50/50 border border-blue-100 rounded text-[10.5px] text-slate-605 font-mono flex flex-col gap-0.5">
                      <div className="flex justify-between">
                        <span>N = {labState.N}</span>
                        <span>fs = {labState.fs} Hz</span>
                      </div>
                      <div className="border-t border-blue-100/50 pt-0.5 mt-0.5">
                        <InlineMath math={`T_{\\mathrm{observed}} = \\frac{N}{f_s} = \\frac{${labState.N}}{${labState.fs}} = ${(labState.N / labState.fs).toFixed(4)}\\,\\text{s}`} />
                      </div>
                    </div>
                  </div>
                )}

                <InlineFieldError issues={validationIssues} fieldName="N" />
              </div>

              {/* Continuous Model Generator and Signal Source Modes */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block font-sans pb-1.5 border-b border-slate-100 mb-1">
                  4. Physical & Model Properties
                </label>
                
                <div className="space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-605">Signal Source Kind:</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { kind: 'discrete_only', label: 'Discrete-only sequence' },
                      { kind: 'interpolation_guide', label: 'Interpolation guide — not a unique original continuous signal' },
                      { kind: 'analytic', label: 'Continuous source' },
                    ].map((s) => (
                      <button
                        key={`source-btn-${s.kind}`}
                        onClick={() => {
                          const nextKind = s.kind as any;
                          setSignalSourceKind(nextKind);
                          setSelectedFrameM(0);
                          setSelectedLocalIndexL(0);
                          if (nextKind !== 'analytic' && signalType === 'smooth-source') {
                            setSignalType('deterministic-random');
                          }
                        }}
                        className={`py-1.5 px-2.5 border rounded-lg text-left text-xs font-semibold block w-full transition-all cursor-pointer leading-tight ${
                          signalSourceKind === s.kind
                            ? 'bg-blue-600 border-blue-600 text-white font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {signalSourceKind !== 'analytic' && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10.5px] font-semibold text-slate-600 block">Generator Wave:</span>
                    <select
                      value={signalType}
                      onChange={(e) => setSignalType(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-250 rounded text-xs text-slate-705 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    >
                      <option value="deterministic-random">LCG Pseudo-Random Wave</option>
                      <option value="sine">1.5-Cycle Academic Sine Wave</option>
                      <option value="multi-tone">Multi-Tone Wave Vector</option>
                    </select>
                  </div>
                )}

                {signalSourceKind !== 'analytic' && signalType === 'deterministic-random' && (
                  <div className="space-y-1">
                    <span className="text-[10.5px] font-semibold text-slate-605 block">Random Pattern Seed:</span>
                    <input
                      type="number"
                      value={noiseSeed}
                      onChange={(e) => setNoiseSeed(Number(e.target.value))}
                      className="w-full p-1 bg-white border border-slate-250 rounded font-mono text-center text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                )}

                <InlineFieldError issues={validationIssues} fieldName="signalSourceKind" />
              </div>

              {/* Framing parameters */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block font-sans pb-1.5 border-b border-slate-100 mb-1">
                  5. Framing Parameters (L, H)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-655 flex items-center gap-1 text-[11px]">
                      <span>Frame Length (L)</span>
                      <MathBadge math="L" />
                    </label>
                    <input
                      type="number"
                      value={advL}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAdvL(val);
                        setSelectedFrameM(0);
                        setSelectedLocalIndexL(0);
                      }}
                      className="w-full p-1.5 bg-white border border-slate-250 rounded font-mono text-center text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-655 flex items-center gap-1 text-[11px]">
                      <span>Hop Size (H)</span>
                      <MathBadge math="H" />
                    </label>
                    <input
                      type="number"
                      value={advH}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAdvH(val);
                        setSelectedFrameM(0);
                        setSelectedLocalIndexL(0);
                      }}
                      className="w-full p-1.5 bg-white border border-slate-250 rounded font-mono text-center text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Advanced parameters / gap mode toggle */}
                <div className="pt-2.5 flex items-center justify-between border-t border-slate-100 mt-2">
                  <span className="text-[11px] font-sans font-semibold text-slate-650 flex flex-col">
                    <span>Allow gap mode ({<InlineMath math="H > L" />})</span>
                    <span className="text-[9.5px] font-normal text-slate-450 leading-tight">Allows frame sequences to skip source samples</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllowGapMode(!allowGapMode)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      allowGapMode ? 'bg-blue-600' : 'bg-slate-250'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        allowGapMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-1 pt-1.5">
                  <InlineFieldError issues={validationIssues} fieldName="L" />
                  <InlineFieldError issues={validationIssues} fieldName="H" />
                </div>
              </div>

              {/* Developer Math Debug Panel (Collapsible, Requirement Redesign) */}
              <div id="runtime-debug-card" className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsDebugExpanded(!isDebugExpanded)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-100/60 hover:bg-slate-100 border-none outline-none cursor-pointer transition-colors"
                >
                  <span className="font-bold text-slate-700 text-xs tracking-wider uppercase font-sans flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isDebugExpanded ? 'bg-teal-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    Runtime math state
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono font-bold">
                    {isDebugExpanded ? 'Collapse ▲' : 'Expand ▼'}
                  </span>
                </button>

                {isDebugExpanded && (
                  <div className="p-4 border-t border-slate-200/60 space-y-3.5 font-sans text-xs bg-white text-slate-705">
                    <p className="text-[10.5px] text-slate-550 leading-relaxed font-sans pb-2 border-b border-slate-100">
                      Calculated values and internal configuration variables used by discrete processes.
                    </p>
                    
                    <div className="space-y-2 font-sans">
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Display mode:</span>
                        <span className="font-mono text-[11px] text-slate-800 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                          {samplingDisplayMode === 'physical_time_view' ? 'Physical-time view' : 'Index view'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Sample count mode:</span>
                        <span className="font-mono text-[11px] text-slate-800 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                          {sampleCountMode === 'fixed_duration' ? 'Fixed duration' : 'Fixed N'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Source kind:</span>
                        <span className="font-mono text-[11px] text-slate-800 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                          {signalSourceKind === 'discrete_only' 
                            ? 'Discrete only' 
                            : signalSourceKind === 'interpolation_guide'
                              ? 'Interpolation guide'
                              : 'Continuous source'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1">
                          Total duration <InlineMath math="T_{\mathrm{total}}" />:
                        </span>
                        <span className="font-mono text-[11.5px] font-bold text-slate-800">{T_total.toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1">
                          Sampling frequency <InlineMath math="f_s" />:
                        </span>
                        <span className="font-mono text-[11.5px] font-bold text-slate-800">{labState.fs} Hz</span>
                      </div>
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                        <span className="text-slate-500 flex items-center gap-1">
                          Sample count <InlineMath math="N" />:
                        </span>
                        <span className="font-mono text-[11.5px] font-bold text-emerald-600">{labState.N}</span>
                      </div>
                      <div className="flex justify-between items-center pb-0.5">
                        <span className="text-slate-500 flex items-center gap-1">
                          Observed duration <InlineMath math="T_{\mathrm{observed}}" />:
                        </span>
                        <span className="font-mono text-[11.5px] font-bold text-blue-600">{(labState.N / labState.fs).toFixed(4)} s</span>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-150 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const stateSummary = {
                              samplingDisplayMode,
                              sampleCountMode,
                              signalSourceKind,
                              T_total,
                              f_s: labState.fs,
                              N: labState.N,
                              T_observed: Number((labState.N / labState.fs).toFixed(4)),
                            };
                            navigator.clipboard.writeText(JSON.stringify(stateSummary, null, 2));
                            setCopiedState(true);
                            setTimeout(() => setCopiedState(false), 2000);
                          }}
                          className="py-1 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10.5px] rounded-lg text-slate-700 transition-colors cursor-pointer font-sans font-semibold shadow-3xs flex-1 text-center"
                        >
                          {copiedState ? '✓ Copied table!' : 'Copy debug state'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setShowRawJson(!showRawJson)}
                          className={`py-1 px-3 border text-[10.5px] rounded-lg transition-colors cursor-pointer font-sans font-semibold shadow-3xs flex-1 text-center ${
                            showRawJson 
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' 
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {showRawJson ? 'Hide raw JSON' : 'Show raw JSON'}
                        </button>
                      </div>

                      {showRawJson && (
                        <pre className="p-2.5 bg-slate-900 border border-slate-950 text-emerald-400 text-[10px] rounded-lg font-mono overflow-x-auto select-all max-h-44 mt-1 leading-normal">
                          {JSON.stringify({
                            samplingDisplayMode,
                            sampleCountMode,
                            signalSourceKind,
                            T_total,
                            f_s: labState.fs,
                            N: labState.N,
                            T_observed: Number((labState.N / labState.fs).toFixed(4)),
                          }, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </aside>

        {/* Right Side: Flexible Content Stepper containing active SVG and math explanation */}
        <section className="flex-1 w-full min-w-0 space-y-5">
          
          {/* Elegant horizontal textbook progress process steps */}
          <div className="grid grid-cols-5 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            {[1, 2, 3, 4, 5].map((stepNum) => {
              const active = activeTab === stepNum;
              return (
                <button
                  key={`step-tab-${stepNum}`}
                  onClick={() => setActiveTab(stepNum)}
                  className={`py-2 px-1 rounded-lg text-center font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'text-slate-500 bg-transparent border-transparent hover:text-slate-800'
                  }`}
                >
                  Step {stepNum}
                </button>
              );
            })}
          </div>

          {/* Core Visual Focus Window Area */}
          <div className="space-y-5">
            {/* Step Subtitle / Objective Box */}
            <div className="p-4 bg-slate-900 text-slate-50 rounded-xl flex justify-between items-center shadow-xs">
              <div className="space-y-1">
                <span className="font-mono text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  DSP Visual Laboratory Figure
                </span>
                <h2 className="text-base font-bold tracking-tight">{currentTabName}</h2>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {activeTab} / 5
              </div>
            </div>

            {/* Dynamically Loaded Core Figure SVG Component */}
            <div className="space-y-4">
              {validationIssues.some(i => i.severity === 'error') ? (
                <div className="bg-red-50/20 border-2 border-dashed border-red-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650">
                    <AlertOctagon className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Visualization Suspended
                    </h3>
                    <p className="text-xs text-slate-650 font-sans leading-relaxed">
                      The current parameter configuration contains active mathematical violations. Fix the blocking errors in the parameter panel to resume visual processing.
                    </p>
                  </div>
                  <div className="max-w-xl mx-auto space-y-2 text-left pt-3 border-t border-slate-100">
                    {validationIssues.filter(i => i.severity === 'error').map(err => (
                      <div key={err.id} className="p-3 bg-white border border-red-150/70 rounded-lg text-xs space-y-1 shadow-3xs">
                        <div className="font-bold text-red-750 flex items-center gap-1.5 font-sans">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {err.title}
                        </div>
                        <p className="text-slate-600 font-sans leading-relaxed">{err.message}</p>
                        {err.formula && (
                          <div className="inline-block bg-slate-50 border px-1.5 py-0.5 rounded text-[10.5px] my-1 font-serif">
                            <InlineMath math={err.formula} />
                          </div>
                        )}
                        {err.suggestedFix && (
                          <div className="text-[11px] text-slate-500 italic font-sans pt-0.5">
                            💡 Suggested fix: {err.suggestedFix}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 1 && (
                    <SignalAxis
                      labState={labState}
                      isSmallDemo={isSmallDemo}
                      onSelectLocalIndex={setSelectedLocalIndexL}
                      playbackG={playbackG}
                      setPlaybackG={setPlaybackG}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                      playbackSpeed={playbackSpeed}
                      setPlaybackSpeed={setPlaybackSpeed}
                      isExpanded={isExpanded}
                      setIsExpanded={setIsExpanded}
                      zoom={zoom}
                      setZoom={setZoom}
                      signalType={signalType}
                      showContinuousSource={showContinuousSource}
                      setShowContinuousSource={setShowContinuousSource}
                      setSamplingDisplayMode={setSamplingDisplayMode}
                    />
                  )}

                  {activeTab === 2 && (
                    <FrameIntervals
                      labState={labState}
                      onSelectFrame={setSelectedFrameM}
                      setL={setAdvL}
                      setH={setAdvH}
                      setN={setAdvN}
                      setFs={handleFsChange}
                      isSmallDemo={isSmallDemo}
                      hoveredSymbol={null}
                      setHoveredSymbol={() => {}}
                    />
                  )}

                  {activeTab === 3 && (
                    <LocalCoordinateMap
                      labState={labState}
                      onSelectLocalIndex={setSelectedLocalIndexL}
                    />
                  )}

                  {activeTab === 4 && (
                    <PhysicalTimeMap
                      labState={labState}
                      isSmallDemo={isSmallDemo}
                    />
                  )}

                  {activeTab === 5 && (
                    <WindowOperator
                      labState={labState}
                      windowType={windowType}
                      onSelectLocalIndex={setSelectedLocalIndexL}
                    />
                  )}
                </>
              )}
            </div>

            {/* Structured academic walkthrough and concepts toggler */}
            <MathWalkthrough labState={labState} />

            {/* Pagination Controls Footer */}
            <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl">
              <button
                disabled={activeTab === 1}
                onClick={() => setActiveTab(activeTab - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold text-xs uppercase disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
                id="back-step-btn"
              >
                <ChevronLeft size={14} /> Back
              </button>

              <div className="text-xs font-mono text-slate-400">
                Step {activeTab} of 5
              </div>

              <button
                disabled={activeTab === 5}
                onClick={() => setActiveTab(activeTab + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-750 font-bold text-white text-xs uppercase disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
                id="next-step-btn"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />

      {/* Floating active toasts region */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
