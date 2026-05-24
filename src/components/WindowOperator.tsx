/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { LabState } from '../math/framing';
import { InlineMath, MathBlock } from './Math';
import { 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X, 
  Info,
  Layers,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Minimize2
} from 'lucide-react';

interface WindowOperatorProps {
  labState: LabState;
  windowType: 'rectangular' | 'hann' | 'custom-bartlett';
  onSelectLocalIndex: (ell: number) => void;
}

export const WindowOperator: React.FC<WindowOperatorProps> = ({
  labState,
  windowType,
  onSelectLocalIndex,
}) => {
  const {
    L,
    selectedFrameM: m,
    selectedEll: ell,
    selectedLocalFrameValues,
    windowValues,
    windowedValues,
  } = labState;

  // React local states for expand modal and interactive zooming
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFitAll, setIsFitAll] = useState(true);
  const [isAlgebraExpanded, setIsAlgebraExpanded] = useState(true);

  // Tooltip tracking state for pointwise mouse hover interaction
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // References to wrap graphs for proper container mouse client-coordinate offsets
  const wrapperRef = useRef<HTMLDivElement>(null);
  const modalWrapperRef = useRef<HTMLDivElement>(null);

  // Dismiss expanded screen with Escape key comfortably
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Handle fit limits 
  useEffect(() => {
    if (isFitAll) {
      setZoomScale(1.0);
    }
  }, [isFitAll]);

  const handleZoom = (direction: 'in' | 'out') => {
    setIsFitAll(false);
    setZoomScale(prev => {
      if (direction === 'in') return Math.min(2.5, prev + 0.25);
      return Math.max(0.65, prev - 0.25);
    });
  };

  // Safe window descriptive mapping names
  const windowName = {
    'rectangular': 'Rectangular',
    'hann': 'Hann',
    'custom-bartlett': 'Bartlett (Triangular)',
  }[windowType] || windowType;

  // Derive dynamic multiplication variables for selected slice
  const selectedRaw = selectedLocalFrameValues[ell] ?? 0;
  const selectedW = windowValues[ell] ?? 0;
  const selectedWindowed = windowedValues[ell] ?? 0;

  // Core Math - Coherent Gain calculation for academic correctness
  const calculatedCG = windowValues.reduce((sum, w) => sum + w, 0) / (L || 1);

  // Tooltip coordinates mapping based on current hovered index node item
  const handleMouseMove = (l: number, e: React.MouseEvent, isModal: boolean) => {
    const currentRef = isModal ? modalWrapperRef.current : wrapperRef.current;
    if (!currentRef) return;

    const rect = currentRef.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setHoveredIdx(l);
    setTooltipPos({ x: cursorX, y: cursorY });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltipPos(null);
  };

  // Render the horizontal pointwise multiplication tracks
  const renderPointwisePlots = (isModal: boolean) => {
    const activeZoom = isModal ? zoomScale : 1.0;
    const baseSvgWidth = 1000;
    const currentSvgWidth = baseSvgWidth * activeZoom;
    
    // Setting tall comfortable heights as specified in guidelines
    const svgHeight = isModal ? 785 : 565;
    
    // Track zero Y centers
    const row1Y = isModal ? 150 : 105; // Raw Buffer
    const row2Y = isModal ? 385 : 280; // Window Coefficients
    const row3Y = isModal ? 620 : 455; // Tapered Wave Output

    // Central operators positioning
    const multY = (row1Y + row2Y) / 2;
    const equalY = (row2Y + row3Y) / 2;

    // Amplitude scalar values
    const sigScale = isModal ? 95 : 65; 
    const winScale = isModal ? 100 : 75; // weights map nicely between 0 and 1

    const getX = (currEll: number) => {
      const paddingLeft = 145;
      const paddingRight = 145;
      const activePlotWidth = currentSvgWidth - paddingLeft - paddingRight;
      if (L <= 1) return paddingLeft + activePlotWidth / 2;
      return paddingLeft + (currEll / (L - 1)) * activePlotWidth;
    };

    return (
      <div 
        ref={isModal ? modalWrapperRef : wrapperRef}
        className="w-full overflow-x-auto relative rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-3xs custom-scrollbar"
      >
        {/* Customized scrollbars styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar {
            height: 7px;
            width: 7px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f8fafc;
            border-radius: 9999px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 9999px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}} />

        <svg
          viewBox={`0 0 ${currentSvgWidth} ${svgHeight}`}
          style={{ width: `${currentSvgWidth}px`, height: `${svgHeight}px` }}
          className="overflow-visible select-none bg-white transition-all duration-150 mx-auto"
        >
          {/* Visual definitions for textbook gradients and pattern fills */}
          <defs>
            <linearGradient id="sliceBandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.06" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="hoverBandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.03" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="rawStemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="taperStemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {/* BACKGROUND GUIDELINES: Subtle vertical lanes for all values of ell */}
          {Array.from({ length: L }).map((_, l) => {
            const xPos = getX(l);
            return (
              <line
                key={`grid-line-${l}`}
                x1={xPos}
                y1={30}
                x2={xPos}
                y2={svgHeight - 40}
                stroke="#f1f5f9"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            );
          })}

          {/* Hover highlight column band */}
          {hoveredIdx !== null && (
            <rect
              x={getX(hoveredIdx) - 18 * activeZoom}
              y={25}
              width={36 * activeZoom}
              height={svgHeight - 65}
              fill="url(#hoverBandGrad)"
              rx="6"
              className="pointer-events-none"
            />
          )}

          {/* Selected active coordinate highlight band slice */}
          <g className="transition-all duration-200 pointer-events-none">
            <rect
              x={getX(ell) - 22 * activeZoom}
              y={20}
              width={44 * activeZoom}
              height={svgHeight - 55}
              fill="url(#sliceBandGrad)"
              stroke="#93c5fd"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              rx="8"
            />
            {/* Soft indicator dot markers mapping alignment edges */}
            <line x1={getX(ell)} y1={20} x2={getX(ell)} y2={svgHeight - 35} stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="2 2" />
          </g>

          {/* VISUAL LAYOUT OPERATOR ALGEBRA FLAGS - Centers of tracks multiplication math icons */}
          {/* Multiplication Operator Lane */}
          <g transform={`translate(${getX(0) - 50}, ${multY})`}>
            <circle cx="0" cy="0" r={isModal ? "18" : "15"} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="0" y={isModal ? "5" : "4"} fill="#64748b" fontSize={isModal ? "14" : "12"} fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">
              ×
            </text>
            <text x="32" y="4" fill="#64748b" fontSize="9.5" fontWeight="bold" textAnchor="start" fontFamily="sans-serif" className="opacity-75">
              Pointwise Multiplication
            </text>
          </g>

          {/* Equal Operator Lane */}
          <g transform={`translate(${getX(0) - 50}, ${equalY})`}>
            <circle cx="0" cy="0" r={isModal ? "18" : "15"} fill="#f0fdf4" stroke="#dcfce7" strokeWidth="1.5" />
            <text x="0" y={isModal ? "4.5" : "3.5"} fill="#166534" fontSize={isModal ? "14" : "12"} fontWeight="extrabold" textAnchor="middle" fontFamily="sans-serif">
              =
            </text>
            <text x="32" y="4" fill="#166534" fontSize="9.5" fontWeight="bold" textAnchor="start" fontFamily="sans-serif" className="opacity-75">
              Windowed Wave Output
            </text>
          </g>


          {/* ============================================== */}
          {/* TRACK 1: RAW LOCAL FRAME: x^(m)[ell] */}
          {/* ============================================== */}
          <g>
            {/* Baseline horizontal divider */}
            <line
              x1={getX(0) - 60}
              y1={row1Y}
              x2={getX(L - 1) + 60}
              y2={row1Y}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            {/* Left Track Title Box */}
            <foreignObject
              x={20}
              y={row1Y - 45}
              width="130"
              height="85"
              className="pointer-events-none"
            >
              <div className="flex flex-col justify-center h-full text-left leading-tight pr-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  Track 1 Input
                </span>
                <span className="text-xs font-black text-slate-800 mt-1 whitespace-nowrap">
                  <span className="track-formula text-sm font-bold">x⁽ᵐ⁾[ℓ]</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                  Raw local frame sequence
                </span>
              </div>
            </foreignObject>

            {/* Discrete data plots */}
            {selectedLocalFrameValues.map((val, l) => {
              const cx = getX(l);
              const cy = row1Y - val * sigScale;
              const isSelected = l === ell;
              const isHovered = l === hoveredIdx;

              return (
                <g 
                   key={`track1-node-${l}`}
                  className="cursor-pointer"
                  onClick={() => onSelectLocalIndex(l)}
                  onMouseMove={(e) => handleMouseMove(l, e, isModal)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Stem line */}
                  <line
                    x1={cx}
                    y1={row1Y}
                    x2={cx}
                    y2={cy}
                    stroke={isSelected ? '#3b82f6' : isHovered ? '#64748b' : '#cbd5e1'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />
                  {/* Outer glowing halo for highlights */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? '10' : '7'}
                      fill={isSelected ? '#3b82f6' : '#94a3b8'}
                      opacity={isSelected ? '0.15' : '0.1'}
                    />
                  )}
                  {/* Hard sample circle dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? '6' : isHovered ? '4.5' : '3.5'}
                    fill={isSelected ? '#1d4ed8' : '#64748b'}
                  />
                </g>
              );
            })}
          </g>


          {/* ============================================== */}
          {/* TRACK 2: WINDOW COEFFICIENTS WEIGHTS: w[ell] */}
          {/* ============================================== */}
          <g>
            {/* Baseline horizontal divider */}
            <line
              x1={getX(0) - 60}
              y1={row2Y}
              x2={getX(L - 1) + 60}
              y2={row2Y}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            {/* Unit line guide w[l] = 1.0 */}
            <line
              x1={getX(0)}
              y1={row2Y - winScale}
              x2={getX(L - 1)}
              y2={row2Y - winScale}
              stroke="#f1f5f9"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <text
              x={getX(L - 1) + 12}
              y={row2Y - winScale + 3}
              fill="#94a3b8"
              fontSize="8.5"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              Unit Height w[ℓ] = 1.0
            </text>

            {/* Left Track Title Box */}
            <foreignObject
              x={20}
              y={row2Y - 45}
              width="130"
              height="85"
              className="pointer-events-none"
            >
              <div className="flex flex-col justify-center h-full text-left leading-tight pr-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  Track 2 Operator
                </span>
                <span className="text-xs font-black text-slate-800 mt-1 whitespace-nowrap">
                  <span className="track-formula text-sm font-bold">w[ℓ]</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                  {windowName} Window
                </span>
              </div>
            </foreignObject>

            {/* Continuous analog model guidelines showing tapering trend curve */}
            {windowType !== 'rectangular' && (
              <path
                d={windowValues.map((wVal, l) => `${l === 0 ? 'M' : 'L'} ${getX(l)} ${row2Y - wVal * winScale}`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeOpacity="0.4"
                strokeDasharray="3 3"
              />
            )}

            {/* Discrete coefficient plots */}
            {windowValues.map((val, l) => {
              const cx = getX(l);
              const cy = row2Y - val * winScale;
              const isSelected = l === ell;
              const isHovered = l === hoveredIdx;

              return (
                <g
                  key={`track2-node-${l}`}
                  className="cursor-pointer"
                  onClick={() => onSelectLocalIndex(l)}
                  onMouseMove={(e) => handleMouseMove(l, e, isModal)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Stem line representation */}
                  <line
                    x1={cx}
                    y1={row2Y}
                    x2={cx}
                    y2={cy}
                    stroke={isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                  />
                  {/* Glowing highlights indicators */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? '9' : '6.5'}
                      fill="#3b82f6"
                      opacity="0.12"
                    />
                  )}
                  {/* Sample point dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? '5.5' : '3.5'}
                    fill={isSelected ? '#1d4ed8' : '#475569'}
                  />
                </g>
              );
            })}
          </g>


          {/* ============================================== */}
          {/* TRACK 3: WINDOWED OUTPUT COEF: \tilde{x}^(m)[ell] */}
          {/* ============================================== */}
          <g>
            {/* Baseline horizontal divider */}
            <line
              x1={getX(0) - 60}
              y1={row3Y}
              x2={getX(L - 1) + 60}
              y2={row3Y}
              stroke="#1e3a8a"
              strokeWidth="1.8"
            />
            {/* Left Track Title Box */}
            <foreignObject
              x={20}
              y={row3Y - 45}
              width="130"
              height="85"
              className="pointer-events-none"
            >
              <div className="flex flex-col justify-center h-full text-left leading-tight pr-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-700">
                  Track 3 Output
                </span>
                <span className="text-xs font-black text-indigo-950 mt-1 whitespace-nowrap">
                  <span className="track-formula text-sm font-bold text-indigo-950">x̃⁽ᵐ⁾[ℓ]</span>
                </span>
                <span className="text-[10px] text-indigo-500 font-medium mt-0.5 leading-snug">
                  Windowed frame output
                </span>
              </div>
            </foreignObject>

            {/* Discrete output data nodes */}
            {windowedValues.map((val, l) => {
              const cx = getX(l);
              const cy = row3Y - val * sigScale;
              const isSelected = l === ell;
              const isHovered = l === hoveredIdx;

              return (
                <g
                  key={`track3-node-${l}`}
                  className="cursor-pointer"
                  onClick={() => onSelectLocalIndex(l)}
                  onMouseMove={(e) => handleMouseMove(l, e, isModal)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Stem bar line */}
                  <line
                    x1={cx}
                    y1={row3Y}
                    x2={cx}
                    y2={cy}
                    stroke={isSelected ? '#1d4ed8' : isHovered ? '#2563eb' : '#475569'}
                    strokeWidth={isSelected ? '3' : '2'}
                  />
                  {/* Glistening outer target halo */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? '11' : '8'}
                      fill="#2563eb"
                      opacity={isSelected ? '0.2' : '0.1'}
                    />
                  )}
                  {/* Solid sample output point dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? '7' : isHovered ? '5' : '4'}
                    fill={isSelected ? '#1d4ed8' : '#0284c7'}
                  />
                  {/* Perfectly localized horizontal axis coordinate indexes labels */}
                  <foreignObject
                    x={cx - 30}
                    y={row3Y + 8}
                    width="60"
                    height="20"
                    className="overflow-visible pointer-events-none text-center"
                  >
                    <div className={`flex items-center justify-center w-full h-full text-[10px] font-mono leading-none ${isSelected ? 'text-blue-700 font-extrabold font-sans' : 'text-slate-400 font-medium'}`}>
                      ℓ = {l}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>

        </svg>

        {/* Dynamic Opaque Coordinate Bubble Tooltip (Tracks Mouse moves accurately and renders Katex) */}
        {hoveredIdx !== null && tooltipPos && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipPos.x + 15}px`,
              top: `${tooltipPos.y - 130}px`,
            }}
            className="z-50 min-w-[210px] bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-xl pointer-events-none select-none text-xs space-y-1.5 leading-none backdrop-blur-3xs"
          >
            <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between text-[10px] uppercase font-bold text-blue-450 font-sans">
              <span>Pointwise Weights Slice</span>
              <span className="text-[9px] font-mono text-slate-400">
                Index ℓ = {hoveredIdx}
              </span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans flex items-center gap-1.5">
                  <span className="text-slate-400">Raw input:</span>
                  <span className="font-serif italic font-medium">x⁽ᵐ⁾[ℓ]</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {(selectedLocalFrameValues[hoveredIdx] ?? 0).toFixed(4)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans flex items-center gap-1.5">
                  <span className="text-slate-400">Window:</span>
                  <span className="font-serif italic font-medium">w[ℓ]</span>
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {(windowValues[hoveredIdx] ?? 0).toFixed(4)}
                </span>
              </div>

              <div className="border-t border-slate-800 my-1" />

              <div className="flex justify-between items-center text-slate-100">
                <span className="text-blue-300 font-sans font-bold flex items-center gap-1.5">
                  <span>Tapered output:</span>
                  <span className="font-serif italic font-semibold">x̃⁽ᵐ⁾[ℓ]</span>
                </span>
                <span className="font-black text-amber-300 font-mono text-sm">
                  {(windowedValues[hoveredIdx] ?? 0).toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">

      {/* Header section with expanded modal launcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Window Operator Alignment</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
              Step 5
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing pointwise multiplication operators mapping raw sample buffers to strictly windowed functions:
          </p>
          <div className="mt-2 overflow-x-auto">
            <MathBlock
              math={"\\tilde{x}^{(m)}[\\ell] = x^{(m)}[\\ell] \\cdot w[\\ell]"}
              className="step5-hero-formula"
            />
          </div>
        </div>

        {/* Expand timeline controller button */}
        <button
          onClick={() => setIsExpanded(true)}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-700 hover:text-blue-800 text-xs font-bold rounded-lg transition-colors cursor-pointer font-sans shadow-3xs"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Expand window operator</span>
        </button>
      </div>

      {/* Grid containing our Aligned Hero graph and collapsable Operator algebra details side-card */}
      <div className="flex flex-col space-y-6">
        
        {/* Main interactive visualization block */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 select-none">
            <span className="font-extrabold uppercase tracking-widest text-[9px] font-sans">
              POINTWISE ALIGNMENT SYSTEM MATRIX (Height: 565px) &bull; CLICK NODES TO NAVIGATE
            </span>
            <span className="text-[10px] bg-slate-100 border border-slate-150 px-2.5 py-0.5 rounded font-sans text-slate-600 font-semibold flex items-center gap-1">
              <Layers className="h-3 w-3 text-blue-500" /> Aligned by common index ℓ
            </span>
          </div>

          {/* Pointwise plots */}
          {renderPointwisePlots(false)}
        </div>

        {/* Lower row sharing: Selected coordinate calculation Callout AND the Operator algebra card side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          
          {/* Selected Coordinate Pointwise Callout */}
          <div className="md:col-span-5 bg-blue-50/75 border border-blue-150 rounded-xl p-5 space-y-4 shadow-3xs">
            <div className="flex items-center gap-2 border-b border-blue-200/50 pb-2 flex-wrap">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-800">
                Pointwise Node Callout Details
              </span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-500">Selected coordinate index:</span>
                <span className="text-blue-800 font-bold bg-white px-2 py-0.5 rounded border border-blue-100">
                  ℓ = {ell}
                </span>
              </div>

              <div className="space-y-2 bg-white border border-blue-100/55 p-3.5 rounded-lg">
                <div className="font-medium text-slate-400 text-[10px] uppercase font-sans mb-1">
                  Pointwise Substituted Calculation
                </div>
                {/* Center equation formula */}
                <div className="flex items-center justify-center p-2 bg-slate-50 border border-slate-100 rounded leading-none">
                  <InlineMath math={`\\tilde{x}^{(${m})}[${ell}] = x^{(${m})}[${ell}] \\cdot w[${ell}]`} />
                </div>
                
                <div className="flex items-center justify-between font-mono text-xs pt-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 uppercase">Input Node</span>
                    <span className="font-bold text-slate-800">{selectedRaw.toFixed(4)}</span>
                  </div>
                  <span className="text-slate-400 font-sans">×</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 uppercase">Weight</span>
                    <span className="font-bold text-[#b45309]">{selectedW.toFixed(4)}</span>
                  </div>
                  <span className="text-slate-400 font-sans">=</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-blue-500 uppercase font-sans font-bold">Result</span>
                    <span className="font-extrabold text-blue-600 underline decoration-blue-200">{selectedWindowed.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compact visual algebra panel with Coherent gain status */}
          <div className="md:col-span-7 bg-slate-50 border border-slate-150 rounded-xl overflow-hidden flex flex-col justify-between">
            {/* Collapse title header */}
            <div 
              onClick={() => setIsAlgebraExpanded(!isAlgebraExpanded)}
              className="bg-slate-100 px-4 py-3 border-b border-slate-150 flex items-center justify-between cursor-pointer hover:bg-slate-150/50 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 font-sans">
                  Window Operator Matrix &amp; Gain
                </h4>
              </div>
              <button className="text-[10px] text-blue-600 font-bold hover:underline focus:outline-none">
                {isAlgebraExpanded ? "Hide algebra" : "Show algebra"}
              </button>
            </div>

            {/* Algebra details block layout */}
            {isAlgebraExpanded && (
              <div className="p-4.5 space-y-4 flex-1">
                {/* Core academic parameters logic depending on window setting types */}
                {windowType === 'rectangular' ? (
                  <div className="space-y-1.5 font-sans text-xs text-slate-655 leading-relaxed">
                    <p>
                      The <span className="font-black text-slate-800">Rectangular window</span> behaves strictly as an <span className="font-semibold text-blue-700">Identity operator</span>:
                    </p>
                    <div className="bg-white border border-slate-205 p-3 rounded-lg leading-normal text-center font-mono">
                      <InlineMath math={`w[\\ell] = 1 \\quad \\forall \\, \\ell \\in [0, L-1]`} />
                      <div className="border-t border-slate-100 my-1.5" />
                      <span className="font-extrabold text-blue-800">
                        <InlineMath math={`\\tilde{\\mathbf{x}}^{(m)} = \\mathbf{x}^{(m)}`} />
                      </span>
                    </div>
                    <p className="text-[10.5px] italic text-amber-705">
                      No boundary tapering is applied. The limits of the signal values pass unmodified.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 font-sans text-xs text-slate-655 leading-relaxed">
                    <p>
                      The <span className="font-black text-slate-800">{windowName} window</span> scales indices boundary weights to reduce spectral leakage:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-205 p-2.5 rounded text-center">
                        <span className="text-[8.5px] font-bold uppercase text-slate-400 block mb-1">
                          Hadamard Pointwise
                        </span>
                        <InlineMath math={`\\tilde{\\mathbf{x}}^{(m)} = \\mathbf{x}^{(m)} \\odot \\mathbf{w}`} />
                      </div>
                      <div className="bg-white border border-slate-205 p-2.5 rounded text-center">
                        <span className="text-[8.5px] font-bold uppercase text-slate-400 block mb-1">
                          Diagonal Operator
                        </span>
                        <InlineMath math={`\\tilde{\\mathbf{x}}^{(m)} = W \\mathbf{x}^{(m)}`} />
                      </div>
                    </div>
                    <div className="bg-white border border-slate-205 p-2 rounded text-center text-[11px] font-mono font-medium">
                      <InlineMath math={`W = \\operatorname{diag}(w[0], \\ldots, w[L-1])`} />
                    </div>
                  </div>
                )}

                {/* Coherent Gain Status Block containing fixed correct academic terminology guidelines */}
                <div className="border-t border-slate-200/50 pt-3.5 space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                    <span>Coherent Gain (Amplitude calibration)</span>
                    <span className="text-[9px] font-mono text-slate-500">CG_w formula</span>
                  </div>

                  <div className="flex items-center gap-4 bg-white border border-slate-205 rounded-xl p-3 flex-wrap">
                    <div className="font-mono text-xs font-black text-blue-700 bg-blue-50/50 border border-blue-100 p-2 rounded-lg flex items-center justify-center min-w-[120px]">
                      <InlineMath math={`\\text{CG}_3 = \\frac{1}{L}\\sum_{\\ell=0}^{L-1}w[\\ell] = ${calculatedCG.toFixed(4)}`} />
                    </div>

                    <div className="text-[11px] text-slate-500 leading-normal flex-1 font-sans">
                      <span className="font-bold text-slate-700 block">Note regarding FFT calibration:</span>
                      Coherent gain matters for amplitude calibration after FFT. Scaling the recovered spectrum by <InlineMath math="1/CG_w" /> preserves true component weights.
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

      {/* Expanded Modal Interactive Studio */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 sm:p-6 md:p-10">
          <div 
            className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[92vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-150 text-blue-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Interactive Window Operator Studio
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium animate-pulse">
                    Analyze pointwise multiplication steps &bull; Press <span className="font-extrabold text-slate-600 bg-slate-200 rounded px-1.5 py-0.5 text-[10px]">Esc</span> to close
                  </p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleZoom('out')}
                  disabled={isFitAll}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out Graph"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setIsFitAll(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isFitAll
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-220 text-slate-655 hover:text-slate-800'
                  }`}
                  title="Reset to View All Columns Fit"
                >
                  Fit All
                </button>

                <button
                  onClick={() => handleZoom('in')}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Zoom In Graph"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    setZoomScale(1.0);
                    setIsFitAll(false);
                  }}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Reset Scale"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>

                <span className="w-px h-5 bg-slate-200 mx-1.5" />

                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                  title="Close Studio Window"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Modal Body workspace (Graph height: at least 760px for full professional presentation) */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/45 flex-1 max-h-[75vh]">
              
              {/* Reference Grid info banner summary */}
              <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs select-none">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wider font-sans">
                    Window operator alignment state parameters
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-mono font-bold text-slate-600">
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Frame index: <span className="text-blue-700">m = {m}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Selected coordinate: <span className="text-indigo-700">ℓ = {ell}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Window length: <span className="text-purple-700">L = {L}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Window setting: <span className="text-amber-700">{windowName}</span>
                  </div>
                </div>
              </div>

              {/* High-Resolution alignment plots */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-extrabold uppercase tracking-widest text-[9.5px] font-sans">
                    Expanded Alignment Master (Graph height: 785px &bull; Scale: {(zoomScale * 100).toFixed(0)}%)
                  </span>
                  {L > 16 && (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100 font-sans text-[10px]">
                      Swipe horizontally to inspect coordinates
                    </span>
                  )}
                </div>

                {/* Pointwise plots from modal context */}
                {renderPointwisePlots(true)}
              </div>

              {/* Split calculation detail explanation cells */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                
                {/* Visual Math Info Block 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 font-sans">
                    The Hadamard Pointwise Product
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-sans leading-relaxed">
                    <p>
                      The window operator is not a sample selection logic (which already completed during frame extraction). Rather, windowing applies coefficients <InlineMath math="w[\\ell]" className="whitespace-nowrap inline-block" /> as deterministic pointwise weights:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-center font-mono">
                      <InlineMath math={`\\tilde{x}^{(m)}[\\ell] = x^{(m)}[\\ell] \\cdot w[\\ell]`} />
                    </div>
                    <p>
                      This alignment has exactly matching indices <InlineMath math="\ell \in [0, L-1]" /> on both vectors, representing direct pointwise vector multiplication (Hadamard operator).
                    </p>
                  </div>
                </div>

                {/* Visual Math Info Block 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 font-sans">
                    Smooth Boundary Conditions
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-sans leading-relaxed">
                    <p>
                      Tapering is applied near outer edges to enforce continuous zero boundary conditions, mitigating high-frequency spectral artifacts prior to taking Fourier transforms:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-center font-mono">
                      <InlineMath math={`w[0] \\approx 0 \\quad \\text{and} \\quad w[L-1] \\approx 0`} />
                    </div>
                    <p>
                      For non-rectangular parameters, this visibly compresses signals towards boundaries while leaving the middle indices intact.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer status info */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center text-[10.5px] text-slate-400 font-medium">
              <span>Coherent Gain Amplitude Correction: <InlineMath math={`CG_w = ${calculatedCG.toFixed(4)}`} /></span>
              <span>Operator Reference Block: OP-W-{windowType}-L-{L}-M-{m}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WindowOperator;
