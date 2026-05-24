/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState } from 'react';
import { LabState } from '../math/framing';
import { InlineMath, MathLabel, MathCallout, MathBadge } from './Math';
import { SignalType, evaluateSmoothDeterministicXC } from '../math/signal';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw 
} from 'lucide-react';

interface SignalAxisProps {
  labState: LabState;
  isSmallDemo: boolean;
  onSelectLocalIndex: (ell: number) => void;
  playbackG: number;
  setPlaybackG: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: 'slow' | 'normal' | 'fast' | 'step';
  setPlaybackSpeed: (speed: 'slow' | 'normal' | 'fast' | 'step') => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  signalType: SignalType;
  showContinuousSource: boolean;
  setShowContinuousSource: (show: boolean) => void;
  setSamplingDisplayMode?: (mode: 'index_view' | 'physical_time_view') => void;
}

export const SignalAxis: React.FC<SignalAxisProps> = ({
  labState,
  isSmallDemo,
  onSelectLocalIndex,
  playbackG,
  setPlaybackG,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  isExpanded,
  setIsExpanded,
  zoom,
  setZoom,
  signalType,
  showContinuousSource,
  setShowContinuousSource,
  setSamplingDisplayMode,
}) => {
  const {
    fs,
    N,
    L,
    H,
    selectedFrameM,
    selectedEll,
    signalValues,
    selectedFrame,
    selectedGlobalIndex,
    selectedSampleValue,
    signalSourceKind,
    samplingDisplayMode,
    sampleCountMode,
    T_total,
  } = labState;

  const frameStart = selectedFrame.start;
  const frameEndExcl = selectedFrame.endExcl;

  // Local state for interactive sample hovering
  const [hoveredG, setHoveredG] = useState<number | null>(null);
  const [hoveredL, setHoveredL] = useState<number | null>(null);
  const [tableTooltip, setTableTooltip] = useState<{ l: number; x: number; y: number } | null>(null);

  // Keyboard listener for ESC to close expanded modal
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, setIsExpanded]);

  const handleTableMouseMove = (e: React.MouseEvent<HTMLTableCellElement>, l: number) => {
    const currentTarget = e.currentTarget;
    const container = currentTarget.closest('.relative');
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + 15;
      const y = e.clientY - rect.top + 15;
      setTableTooltip({ l, x, y });
    }
  };

  // High-Resolution Academic Plot Layout Geometry
  const paddingLeft = 90;
  const paddingRight = 50;
  const paddingTop = 45;
  const paddingBottom = 150;

  const basePlotWidth = 845;
  const svgHeight = 530;

  const plotTop = 60;
  const plotBottom = 255;
  const zeroY = 157.5; // Centers the zero baseline exactly where plotTop is 60 and plotBottom is 255
  const yScale = 97.5; // (255 - 60) / 2

  // Format continuous physical seconds timestamp
  const formatTime = (g: number) => {
    const t = g / fs;
    if (isSmallDemo) {
      return `${g}/${fs} s`;
    } else {
      if (t < 0.001) {
        return `${(t * 1000000).toFixed(0)} µs`;
      }
      return `${(t * 1000).toFixed(2)} ms`;
    }
  };

  const formatPhysicalTimeLabel = (g: number) => {
    if (g === 0) return "0";
    const val = g / fs;
    const decimalStr = val.toFixed(4).replace(/\.?0+$/, '');
    return `${g}/${fs} s = ${decimalStr} s`;
  };

  // Sparse index grid check to keep visual clutter at zero for customizable variables
  const shouldShowIndexLabel = (g: number, currentPlotWidth: number) => {
    // Always show selected global index
    if (g === selectedGlobalIndex) return true;
    // Always show playback index
    if (g === playbackG) return true;
    // Always show frame boundaries: frameStart and frameEndExcl - 1
    if (g === frameStart || g === frameEndExcl - 1) return true;

    if (N <= 16) return true;

    const spacing = currentPlotWidth / (N - 1);
    if (spacing >= 24) return true;

    // Sparse labels for larger N (e.g. N=32 or N>32)
    return g % 4 === 0 || g === N - 1;
  };

  // Step Controllers
  const handlePrevStep = () => {
    setPlaybackG((prev) => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    setPlaybackG((prev) => Math.min(N - 1, prev + 1));
  };

  // Zoom Helpers
  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.0, z + 0.25));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(1.0, z - 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1.0);
  };

  const renderSVGGraph = (isGraphInModal: boolean) => {
    const currentZoom = isGraphInModal ? zoom : 1.0;
    const plotWidth = basePlotWidth * currentZoom;
    const svgWidth = paddingLeft + plotWidth + paddingRight;

    // Map absolute index g to horizontal coordinate x (0 to 15 mapped linearly)
    const getX = (g: number) => {
      if (samplingDisplayMode === 'physical_time_view') {
        const t = g / fs;
        return paddingLeft + (t / T_total) * plotWidth;
      } else {
        if (N <= 1) return paddingLeft + plotWidth / 2;
        return paddingLeft + (g / (N - 1)) * plotWidth;
      }
    };

    // Dynamic calculations for timeline ticks
    const getTimeTicks = () => {
      const ticks = new Set<number>();
      ticks.add(0);

      const minSpacingPx = 100;
      const sampleSpacingPx = plotWidth / (N - 1);
      const hopSpacingPx = H * sampleSpacingPx;

      if (hopSpacingPx >= minSpacingPx) {
        let current = H;
        while (current < N - 1) {
          ticks.add(current);
          current += H;
        }
      } else {
        const hopMultiplier = Math.ceil(minSpacingPx / hopSpacingPx);
        const step = H * hopMultiplier;
        let current = step;
        while (current < N - 1) {
          ticks.add(current);
          current += step;
        }
      }

      ticks.add(N - 1);

      // Always show selected g and playback cursor times on physical timeline
      ticks.add(selectedGlobalIndex);
      ticks.add(playbackG);

      const sortedTicks = Array.from(ticks).sort((a, b) => a - b);
      const filteredTicks: number[] = [];
      
      for (let i = 0; i < sortedTicks.length; i++) {
        const curr = sortedTicks[i];
        if (curr === 0 || curr === N - 1 || curr === selectedGlobalIndex || curr === playbackG) {
          filteredTicks.push(curr);
          continue;
        }
        // Filter out auto-generated ticks too close to dynamic highlights (within 1 index)
        const distToSelected = Math.abs(curr - selectedGlobalIndex);
        const distToPlayback = Math.abs(curr - playbackG);
        if (distToSelected <= 1 || distToPlayback <= 1) {
          continue;
        }
        filteredTicks.push(curr);
      }

      return filteredTicks;
    };

    const timeTicks = getTimeTicks();

    // Spacing width for half-open interval coverage boundaries
    const sampleSpacing = samplingDisplayMode === 'physical_time_view' 
      ? (1 / fs) / T_total * plotWidth 
      : plotWidth / (N - 1);
    const bandStartX = Math.max(paddingLeft, getX(frameStart) - sampleSpacing / 2);
    const bandEndX = Math.min(svgWidth - paddingRight, getX(frameEndExcl - 1) + sampleSpacing / 2);

    const frameElementsStr = L <= 8
      ? Array.from({ length: L }).map((_, l) => frameStart + l).join(', ')
      : `${frameStart}, ..., ${frameEndExcl - 1}`;

    const splinePoints: string[] = [];

    const interpolateSpline = (gReal: number, values: number[]): number => {
      const n = values.length;
      if (n === 0) return 0;
      if (gReal <= 0) return values[0];
      if (gReal >= n - 1) return values[n - 1];

      const g1 = Math.floor(gReal);
      const t = gReal - g1;

      const y1 = values[g1];
      const y2 = values[Math.min(n - 1, g1 + 1)];
      const y0 = g1 > 0 ? values[g1 - 1] : 2 * y1 - y2;
      const y3 = g1 < n - 2 ? values[g1 + 2] : 2 * y2 - y1;

      const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
      const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
      const a2 = -0.5 * y0 + 0.5 * y2;
      const a3 = y1;

      return a0 * t * t * t + a1 * t * t + a2 * t + a3;
    };

    if (showContinuousSource) {
      const steps = 512;
      for (let i = 0; i <= steps; i++) {
        let xPos = 0;
        let yVal = 0;
        if (samplingDisplayMode === 'physical_time_view') {
          const t = (i / steps) * T_total;
          xPos = paddingLeft + (t / T_total) * plotWidth;
          if (signalSourceKind === 'analytic') {
            yVal = evaluateSmoothDeterministicXC(t);
          } else {
            const gReal = t * fs;
            yVal = interpolateSpline(gReal, signalValues);
          }
        } else {
          // index_view
          const gReal = (i / steps) * (N - 1);
          xPos = getX(gReal);
          if (signalSourceKind === 'analytic') {
            const t = gReal / fs;
            yVal = evaluateSmoothDeterministicXC(t);
          } else {
            yVal = interpolateSpline(gReal, signalValues);
          }
        }
        const yPos = zeroY - yVal * yScale;
        splinePoints.push(`${i === 0 ? 'M' : 'L'} ${xPos} ${yPos}`);
      }
    }

    return (
      <svg
        id={`global-signal-svg-${isGraphInModal ? 'modal' : 'main'}`}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="h-full overflow-visible transition-all duration-150"
        style={{ width: `${svgWidth}px` }}
      >
        {/* LAYER 1 — Background Highlight and Selected Frame Band */}
        <rect
          x={bandStartX}
          y={zeroY - yScale - 15}
          width={bandEndX - bandStartX}
          height={yScale * 2 + 30}
          fill="#eff6ff"
          stroke="#bfdbfe"
          strokeWidth="1"
          strokeDasharray="4 4"
          rx={8}
          className="transition-all duration-300"
        />

        {/* LAYER 1.5 — Continuous Source Wave / Interpolated Guide Curve */}
        {showContinuousSource && splinePoints.length > 0 && (
          <path
            d={splinePoints.join(' ')}
            fill="none"
            stroke={signalSourceKind === 'analytic' ? '#2563eb' : '#94a3b8'}
            strokeWidth="1.8"
            strokeOpacity="0.85"
            className="transition-all duration-300 pointer-events-none"
          />
        )}

        {/* Vertical sampling-time dashed guidelines (for readability, auto-hidden if N > 32) */}
        {showContinuousSource && N <= 32 && signalValues.map((val, g) => {
          const sxPos = getX(g);
          const syPos = zeroY - val * yScale;
          return (
            <line
              key={`sample-time-dotguide-${g}-${isGraphInModal}`}
              x1={sxPos}
              y1={zeroY}
              x2={sxPos}
              y2={syPos}
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              strokeOpacity="0.6"
              className="pointer-events-none"
            />
          );
        })}

        {/* LAYER 2 — Grid and Axes */}
        {[-1.0, -0.5, 0.5, 1.0].map((level) => {
          const gy = zeroY - level * yScale;
          return (
            <line
              key={`guide-grid-${level}-${isGraphInModal}`}
              x1={paddingLeft}
              y1={gy}
              x2={svgWidth - paddingRight}
              y2={gy}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          );
        })}

        {/* Core Zero Baseline */}
        <line
          x1={paddingLeft - 20}
          y1={zeroY}
          x2={svgWidth - paddingRight + 20}
          y2={zeroY}
          stroke="#64748b"
          strokeWidth="1.2"
        />

        {/* Y-axis Amplitude Labels */}
        <g className="font-mono text-[11px] fill-slate-500 font-medium">
          <text x={paddingLeft - 15} y={zeroY - yScale + 4} textAnchor="end">1.0</text>
          <text x={paddingLeft - 15} y={zeroY + 4} textAnchor="end">0.0</text>
          <text x={paddingLeft - 15} y={zeroY + yScale + 4} textAnchor="end">-1.0</text>
          
          <foreignObject
            x={paddingLeft - 12}
            y={zeroY - yScale - 32}
            width="40"
            height="20"
            className="overflow-visible pointer-events-none"
          >
            <div className="text-slate-700 font-bold select-none text-[12px]">
              <InlineMath math="x[g]" />
            </div>
          </foreignObject>
        </g>

        {/* LAYER 3 — Stems and Sample Dots */}
        {signalValues.map((val, g) => {
          const sxPos = getX(g);
          const syPos = zeroY - val * yScale;
          const isSelected = g === selectedGlobalIndex;
          const inFrame = g >= frameStart && g < frameEndExcl;
          const isPlaybackCurrent = g === playbackG;

          // Determine coloring according to academic scanning specs
          let stemStroke = '#cbd5e1'; // default unvisited
          let dotFill = '#94a3b8'; // default unvisited dot
          let dotRadius = 4;
          let strokeWidthValue = 1.2;

          if (isSelected) {
            // High priority absolute coordinate highlight
            stemStroke = '#1d4ed8'; // blue manual selected
            dotFill = '#1d4ed8';
            dotRadius = 6;
            strokeWidthValue = 2.2;
          } else if (isPlaybackCurrent) {
            // Highly visible active playback scanner cursor
            stemStroke = '#8b5cf6'; // royal purple playback
            dotFill = '#8b5cf6';
            dotRadius = 6;
            strokeWidthValue = 2.2;
          } else {
            // Sweep trailing wave edge coloring logic:
            if (inFrame) {
              if (g < playbackG) {
                stemStroke = '#475569'; // Visited frame sample: slate
                dotFill = '#2563eb'; // Bright diagnostic blue
              } else {
                stemStroke = '#cbd5e1'; // Future frame sample
                dotFill = '#cbd5e1';
              }
              dotRadius = 4.5;
              strokeWidthValue = 1.5;
            } else {
              if (g < playbackG) {
                stemStroke = '#94a3b8'; // Visited historic signal node
                dotFill = '#64748b';
              } else {
                stemStroke = '#f1f5f9'; // Future unvisited signal node
                dotFill = '#cbd5e1';
              }
            }
          }

          return (
            <g
              key={`sample-${g}-${isGraphInModal}`}
              className="cursor-pointer"
              onClick={() => {
                setPlaybackG(g);
                if (inFrame) {
                  onSelectLocalIndex(g - frameStart);
                }
              }}
              onMouseEnter={() => setHoveredG(g)}
              onMouseLeave={() => setHoveredG(null)}
            >
              {/* Vertical sample stem */}
              <line
                x1={sxPos}
                y1={zeroY}
                x2={sxPos}
                y2={syPos}
                stroke={stemStroke}
                strokeWidth={strokeWidthValue}
              />
              {/* Stem circle point */}
              <circle
                cx={sxPos}
                cy={syPos}
                r={dotRadius}
                fill={dotFill}
              />
              {/* Sensible spacious invisible hover capture target */}
              <circle
                cx={sxPos}
                cy={syPos}
                r="15"
                fill="transparent"
              />
            </g>
          );
        })}

        {/* LAYER 4 — Active Playback Scanner Cursor Line and Indicators */}
        {(() => {
          const pxPos = getX(playbackG);
          return (
            <g className="pointer-events-none">
              {/* Soft purple playback indicator line */}
              <line
                x1={pxPos}
                y1={60}
                x2={pxPos}
                y2={255}
                stroke="#8b5cf6"
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
              
              {/* Playback boundary triangle at top */}
              <polygon
                points={`${pxPos},60 ${pxPos - 6},50 ${pxPos + 6},50`}
                fill="#8b5cf6"
              />
            </g>
          );
        })()}

        {/* Selected Manual Pulse Overlay */}
        {(() => {
          const sxPos = getX(selectedGlobalIndex);
          const syPos = zeroY - selectedSampleValue * yScale;
          return (
            <g className="pointer-events-none">
              <circle
                cx={sxPos}
                cy={syPos}
                r="11"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeOpacity="0.4"
                className="animate-pulse"
              />
            </g>
          );
        })()}

        {/* LAYER 5 — Academic Callouts, Brackets, and Axis Lanes */}

        {/* Upper Selected Frame bracket outside data region */}
        {N >= L && (
          <g className="transition-all duration-300">
            <path
              d={`M ${getX(frameStart)} 43 L ${getX(frameStart)} 36 L ${getX(frameEndExcl - 1)} 36 L ${getX(frameEndExcl - 1)} 43`}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="1.5"
            />
            <foreignObject
              x={Math.max(0, ((getX(frameStart) + getX(frameEndExcl - 1)) / 2) - 150)}
              y={6}
              width="300"
              height="24"
              className="overflow-visible pointer-events-none"
            >
              <div className="flex items-center justify-center w-full h-full select-none">
                <InlineMath
                  math={`I_{${selectedFrameM}} = \\{ ${frameElementsStr} \\}`}
                />
              </div>
            </foreignObject>
          </g>
        )}

        {/* Hovered Dot Ring */}
        {hoveredG !== null && (() => {
          const hXPos = getX(hoveredG);
          const hVal = signalValues[hoveredG] ?? 0;
          const hYPos = zeroY - hVal * yScale;
          return (
            <g className="pointer-events-none">
              <circle
                cx={hXPos}
                cy={hYPos}
                r="10"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.5"
                strokeOpacity="0.8"
              />
            </g>
          );
        })()}

        {/* Conditional Sample Callout with leader-line */}
        {(() => {
          const calloutG = hoveredG !== null ? hoveredG : (isPlaying ? playbackG : null);
          if (calloutG === null) return null;

          const hX = getX(calloutG);
          const calloutVal = signalValues[calloutG] ?? 0;
          const hY = zeroY - calloutVal * yScale;
          const isPositive = calloutVal >= 0;

          // Place Local selected/hovered sample callout box to prevent overlapping
          const boxY = isPositive ? zeroY + 35 : zeroY - 110;
          const isRightSide = hX > svgWidth / 2;
          const boxX = hX + (isRightSide ? -210 : 30);
          const anchorX = isRightSide ? boxX + 180 : boxX;
          const anchorY = boxY + (isPositive ? 15 : 55);

          const title = hoveredG !== null ? "Sample" : "Playback sample";

          return (
            <g className="pointer-events-none transition-all duration-300">
              <path
                d={`M ${hX} ${hY} L ${anchorX} ${anchorY}`}
                stroke="#2563eb"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                fill="none"
              />
              <circle cx={anchorX} cy={anchorY} r="2.5" fill="#2563eb" />

              <rect
                x={boxX}
                y={boxY}
                width="205"
                height="80"
                rx="8"
                ry="8"
                fill="#ffffff"
                stroke="none"
                opacity="1"
              />

              <foreignObject
                x={boxX}
                y={boxY}
                width="205"
                height="80"
                className="overflow-visible"
              >
                <MathCallout
                  title={title}
                  xFormula={`x[${calloutG}] = ${calloutVal.toFixed(4)}`}
                  gFormula={`g = ${calloutG}`}
                  tFormula={`t_{${calloutG}} = \\frac{${calloutG}}{${fs}}\\,\\mathrm{s} = ${(calloutG / fs).toFixed(3)}\\,\\mathrm{s}`}
                />
              </foreignObject>
            </g>
          );
        })()}

        {/* Selected Sample Guideline across all lanes */}
        {(() => {
          const sxPos = getX(selectedGlobalIndex);
          return (
            <g className="pointer-events-none">
              <line
                x1={sxPos}
                y1={43}
                x2={sxPos}
                y2={460}
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.4"
              />
              
              {/* Blue marker circle on global axis lane (at Y=325) */}
              <circle
                cx={sxPos}
                cy={325}
                r="4.5"
                fill="#1d4ed8"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="shadow-3xs"
              />

              {/* Matching blue marker circle on physical-time axis lane (at Y=460) */}
              <circle
                cx={sxPos}
                cy={460}
                r="4.5"
                fill="#1d4ed8"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="shadow-3xs"
              />
            </g>
          );
        })()}

        {/* Playback Cursor Guideline across all lanes */}
        {(() => {
          const pxPos = getX(playbackG);
          return (
            <g className="pointer-events-none">
              <line
                x1={pxPos}
                y1={60}
                x2={pxPos}
                y2={460}
                stroke="#8b5cf6"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />
              
              {/* Purple circle marker at Y = 325 */}
              <circle
                cx={pxPos}
                cy={325}
                r="4"
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="1"
              />

              {/* Purple circle marker at Y = 460 */}
              <circle
                cx={pxPos}
                cy={460}
                r="4"
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          );
        })()}

        {/* Selected sample link floating text badge inside white lane gap */}
        {(() => {
          const sxPos = getX(selectedGlobalIndex);
          return (
            <foreignObject
              x={sxPos - 95}
              y={352}
              width="190"
              height="30"
              className="overflow-visible pointer-events-none"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="bg-blue-600 text-white font-sans font-bold px-2.5 py-1 rounded-full shadow-md border border-blue-400/50 flex items-center gap-1.5 leading-none text-[10px] whitespace-nowrap">
                  <span className="text-[8px] uppercase tracking-wider opacity-90 font-extrabold bg-blue-700 px-1.5 py-0.5 rounded-full">Selected sample</span>
                  <div className="flex items-center gap-1 font-mono">
                    <InlineMath math={`g = ${selectedGlobalIndex}`} />
                    <span className="opacity-45 text-[8px]">|</span>
                    <InlineMath math={`t_{${selectedGlobalIndex}} = \\frac{${selectedGlobalIndex}}{${fs}}\\,\\mathrm{s}`} />
                  </div>
                </div>
              </div>
            </foreignObject>
          );
        })()}

        {/* LANE A: GLOBAL DISCRETE INDEX AXIS (Y = 325) */}
        <line
          x1={paddingLeft - 15}
          y1={325}
          x2={svgWidth - paddingRight + 15}
          y2={325}
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Lane A Academic Title */}
        <foreignObject
          x={paddingLeft}
          y={274}
          width={plotWidth}
          height={35}
          className="overflow-visible pointer-events-none"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 font-sans text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-blue-700">
              Lane A: Global Sample Index <InlineMath math="g" />
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              <InlineMath math="g \in \{0, 1, \dots, N-1\}" />
            </span>
          </div>
        </foreignObject>

        {/* Discrete Index Ticks and Labels */}
        {signalValues.map((_, g) => {
          if (!shouldShowIndexLabel(g, plotWidth)) return null;
          const sxPos = getX(g);
          const isSelected = g === selectedGlobalIndex;
          const isPlaybackG = g === playbackG;

          return (
            <g key={`idx-tick-${g}-${isGraphInModal}`}>
              <line
                x1={sxPos}
                y1={321}
                x2={sxPos}
                y2={329}
                stroke={isPlaybackG ? '#8b5cf6' : isSelected ? '#1d4ed8' : '#94a3b8'}
                strokeWidth={isSelected || isPlaybackG ? '2' : '1'}
              />
              <text
                x={sxPos}
                y={344}
                fill={isPlaybackG ? '#8b5cf6' : isSelected ? '#1d4ed8' : '#475569'}
                fontSize="12"
                fontFamily="monospace"
                fontWeight={isSelected || isPlaybackG ? 'bold' : '500'}
                textAnchor="middle"
              >
                {g}
              </text>
            </g>
          );
        })}

        {/* LANE B: CONTINUOUS PHYSICAL TIME AXIS (Y = 460) */}
        <line
          x1={paddingLeft - 15}
          y1={460}
          x2={svgWidth - paddingRight + 15}
          y2={460}
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Lane B Academic Title */}
        <foreignObject
          x={paddingLeft}
          y={398}
          width={plotWidth}
          height={35}
          className="overflow-visible pointer-events-none"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 font-sans text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-indigo-700">
              Lane B: Physical Sample Time <InlineMath math="t_g = \frac{g}{f_s}" />
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              <InlineMath math="t_g \in \mathbb{R}" />
            </span>
          </div>
        </foreignObject>

        {/* Sparse Physical Time Ticks and Beautiful Math Overlay labels */}
        {(() => {
          const getPhysicalTicks = () => {
            const ticks = new Set<number>();
            ticks.add(0);
            ticks.add(N - 1);
            ticks.add(selectedGlobalIndex);
            ticks.add(playbackG);

            if (N <= 16) {
              for (let i = 4; i < N - 1; i += 4) {
                ticks.add(i);
              }
            } else if (N <= 32) {
              for (let i = 8; i < N - 1; i += 8) {
                ticks.add(i);
              }
            } else {
              for (let i = 16; i < N - 1; i += 16) {
                ticks.add(i);
              }
            }

            const currentZoom = isGraphInModal ? zoom : 1.0;
            const currentPlotWidth = basePlotWidth * currentZoom;
            const sampleSpacing = currentPlotWidth / (N - 1);
            const minIdxDiff = Math.max(1, Math.floor(75 / sampleSpacing));

            const sortedTicks = Array.from(ticks).sort((a, b) => a - b);
            const result: number[] = [];
            
            for (const gVal of sortedTicks) {
              if (gVal === 0 || gVal === N - 1 || gVal === selectedGlobalIndex || gVal === playbackG) {
                result.push(gVal);
              } else {
                const tooClose = result.some(r => Math.abs(r - gVal) < minIdxDiff);
                if (!tooClose) {
                  result.push(gVal);
                }
              }
            }

            return result.sort((a, b) => a - b);
          };

          const physicalTicks = getPhysicalTicks();

          return physicalTicks.map((gObj) => {
            const sxPos = getX(gObj);
            const isSelected = gObj === selectedGlobalIndex;
            const isPlaybackG = gObj === playbackG;

            return (
              <g key={`phys-tick-${gObj}-${isGraphInModal}`}>
                <line
                  x1={sxPos}
                  y1={456}
                  x2={sxPos}
                  y2={464}
                  stroke={isPlaybackG ? '#8b5cf6' : isSelected ? '#1d4ed8' : '#94a3b8'}
                  strokeWidth={isSelected || isPlaybackG ? '2' : '1'}
                />
                
                {isSelected || isPlaybackG ? (
                  <foreignObject
                    x={sxPos - 70}
                    y={468}
                    width="140"
                    height="45"
                    className="overflow-visible pointer-events-none"
                  >
                    <div className={`flex flex-col items-center justify-center text-[10.5px] font-sans font-bold leading-tight ${isSelected ? 'text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded shadow-3xs border border-blue-200/50' : 'text-purple-705 bg-purple-50/80 px-1.5 py-0.5 rounded shadow-3xs border border-purple-200/50'}`}>
                      <InlineMath math={`t_{${gObj}} = \\frac{${gObj}}{${fs}}\\,\\mathrm{s}`} />
                      <span className="text-[9.5px] opacity-90 mt-0.5">
                        = {(gObj / fs).toFixed(3)}s
                      </span>
                    </div>
                  </foreignObject>
                ) : (
                  <text
                    x={sxPos}
                    y={482}
                    fill="#64748b"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {gObj === 0 ? "0s" : `${gObj}/${fs}s`}
                  </text>
                )}
              </g>
            );
          });
        })()}
      </svg>
    );
  };

  const renderPlaybackControls = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
        {/* Playback Buttons Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all select-none cursor-pointer border ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={13} /> Pause
              </>
            ) : (
              <>
                <Play size={13} /> Play visual scan
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setPlaybackG(0);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
            title="Reset playback cursor"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <button
            onClick={() => setShowContinuousSource(!showContinuousSource)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all select-none cursor-pointer border ${
              showContinuousSource
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
            }`}
          >
            {signalSourceKind !== 'analytic' ? (
              showContinuousSource ? 'Hide interpolation guide' : 'Show interpolation guide'
            ) : (
              showContinuousSource ? 'Hide continuous source' : 'Show continuous source'
            )}
          </button>

          {/* Steppers visible optionally or inside Step Mode */}
          <div className="flex items-center border border-slate-300 rounded-lg bg-orange-50/20 overflow-hidden">
            <button
              onClick={handlePrevStep}
              disabled={playbackG === 0}
              className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40 text-slate-705 cursor-pointer"
              title="Previous sample"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2.5 font-mono text-[11px] font-bold text-slate-700 bg-white min-w-[50px] text-center border-l border-r border-slate-300">
              g = {playbackG}
            </span>
            <button
              onClick={handleNextStep}
              disabled={playbackG >= N - 1}
              className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40 text-slate-705 cursor-pointer"
              title="Next sample"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Speed selectors Segmented controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Speed:</span>
          <div className="inline-flex bg-slate-200 rounded-lg p-0.5 border border-slate-300/60">
            {(['slow', 'normal', 'fast', 'step'] as const).map((speed) => {
              const isActive = playbackSpeed === speed;
              return (
                <button
                  key={`speed-${speed}`}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                    if (speed === 'step') {
                      setIsPlaying(false);
                    }
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold capitalize rounded-md transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-xs scale-102'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  {speed === 'step' ? 'Step' : speed}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderActivePlaybackReadout = () => {
    const valObj = signalValues[playbackG] ?? 0;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-purple-50/50 border border-purple-200/50 rounded-lg text-xs justify-items-center">
        <div className="text-center">
          <span className="text-purple-600 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Active Index</span>
          <span className="text-slate-800 font-bold font-mono">
            <InlineMath math={`g = ${playbackG}`} />
          </span>
        </div>
        <div className="sm:border-l sm:border-r border-purple-200/50 px-4 text-center w-full">
          <span className="text-purple-600 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Sample Value</span>
          <span className="text-slate-800 font-bold font-mono">
            <InlineMath math={`x[${playbackG}] = ${valObj.toFixed(5)}`} />
          </span>
        </div>
        <div className="text-center">
          <span className="text-purple-600 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Physical Timestamp</span>
          <span className="text-slate-800 font-bold font-mono">
            <InlineMath math={`t_{${playbackG}} = \\frac{${playbackG}}{${fs}}\\,\\mathrm{s} = ${(playbackG / fs).toFixed(3)}\\,\\mathrm{s}`} />
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
              <span>Global Sampled Sequence</span>
              <MathBadge math="x[g]" />
              {signalSourceKind === 'analytic' ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Continuous source</span>
              ) : signalSourceKind === 'discrete_only' ? (
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Discrete-only sequence</span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-sans">Interpolation guide — not a unique original continuous signal</span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualize the global continuous signals discrete sampling trace. Run a playback scanning animation vector below.
            </p>
            <div className="mt-2 text-[10.5px] font-medium text-blue-800 bg-blue-50/70 py-1.5 px-3 rounded-md border border-blue-100/50 w-fit leading-normal flex items-center gap-1.5 flex-wrap font-sans shadow-3xs">
              <span className="font-bold">Sampling Rule Status:</span>
              {sampleCountMode === 'fixed_duration' ? (
                <span>“Fixed-duration sampling: changing <InlineMath math="f_s" /> changes <InlineMath math="N = \lfloor T_{\mathrm{total}} \cdot f_s \rfloor" />.”</span>
              ) : (
                <span>“Fixed-N sampling: changing <InlineMath math="f_s" /> changes time labels, not sample count.”</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 text-xs transition-all uppercase tracking-wide cursor-pointer shadow-2xs"
            >
              <Maximize2 size={12} /> ⛶ Expand
            </button>
          </div>
        </div>

        {/* Live Playback Animations Controls Panels */}
        {renderPlaybackControls()}
        {renderActivePlaybackReadout()}

        {/* Graph Display Mode Selector Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-200/65 shadow-3xs gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11.5px] font-semibold text-slate-700 font-sans">Sampling Display View Mode</span>
            <span className="text-[10px] text-slate-600 font-sans font-medium">
              {samplingDisplayMode === 'index_view' ? (
                <span>Index view: horizontal spacing is by sample index <InlineMath math="g" />.</span>
              ) : (
                <span>Physical-time view: horizontal spacing scales with physical time <InlineMath math="t_g = g / f_s" />.</span>
              )}
            </span>
          </div>

          {!isSmallDemo ? (
            <div className="flex items-center bg-slate-200/50 p-1 rounded-lg border border-slate-200 shadow-3xs">
              <button
                onClick={() => setSamplingDisplayMode?.('index_view')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all select-none cursor-pointer ${
                  samplingDisplayMode === 'index_view'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Index View
              </button>
              <button
                onClick={() => setSamplingDisplayMode?.('physical_time_view')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all select-none cursor-pointer ${
                  samplingDisplayMode === 'physical_time_view'
                    ? 'bg-white text-purple-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Physical-Time View
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic bg-amber-50 border border-amber-100 p-1.5 rounded-md">
              Homework Demo is locked to Index View.
            </p>
          )}
        </div>

        {/* Vector Graphics standard preview-plot Area */}
        <div className="relative overflow-x-auto select-none py-2 bg-slate-50/20 rounded-xl border border-slate-100/60 w-full">
          {renderSVGGraph(false)}
        </div>

        {/* Academic Mapping Reference and Instantaneous Readout Helper Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60 p-4 border border-slate-200/80 rounded-xl shadow-3xs">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Mathematical Basis: Sampling Coordinates</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              The discrete sequence index <InlineMath math="g" /> indexes individual samples in integer steps. Under a uniform sampling rate <InlineMath math="f_s" />, each global sample corresponds to a localized continuous physical time instant <InlineMath math="t_g" />:
            </p>
            <div className="flex flex-col gap-1.5 justify-center bg-white p-2.5 rounded-lg border border-slate-150 text-[11px] font-mono leading-normal text-slate-700 mt-2 shadow-3xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-medium">Discrete Index Range:</span>
                <span className="font-semibold text-slate-800"><InlineMath math="g \in \{0, 1, \ldots, N-1\}" /></span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 mt-1">
                <span className="text-slate-500 font-sans font-medium">Time-Mapping Equation:</span>
                <span className="font-semibold text-indigo-700"><InlineMath math="t_g = \frac{g}{f_s}" /></span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active Selected Highlight: Sample {selectedGlobalIndex}</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                The vertical dashed blue guideline highlights how index <InlineMath math="g" /> maps onto its exact mapped physical clock placement:
              </p>
            </div>
            <div className="bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/60 text-[11px] font-mono flex flex-col gap-1.5 text-slate-700 mt-2 shadow-3xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans font-medium">Global Index:</span>
                <span className="font-bold text-slate-850"><InlineMath math={`g = ${selectedGlobalIndex}`} /></span>
              </div>
              <div className="flex justify-between items-center border-t border-emerald-100/35 pt-1.5 mt-1">
                <span className="text-slate-500 font-sans font-medium">Physical Sampling Time:</span>
                <span className="font-bold text-blue-800">
                  <InlineMath math={`t_{${selectedGlobalIndex}} = \\frac{${selectedGlobalIndex}}{${fs}}\\,\\mathrm{s} = ${(selectedGlobalIndex / fs).toFixed(4)}\\,\\mathrm{s}`} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Continuous source notice block */}
        {showContinuousSource && (
          <div className="text-center text-xs text-slate-500 font-sans tracking-wide py-2 bg-slate-50 rounded-lg border border-slate-100 px-4">
            {signalSourceKind === 'discrete_only' ? (
              <span>
                <strong>Discrete-only sequence:</strong> <InlineMath math="f_s" /> changes sample count in fixed-duration mode, but values are generated as discrete samples, not resampled from a true continuous source.
              </span>
            ) : signalSourceKind === 'interpolation_guide' ? (
              <span>
                <strong>Interpolation guide:</strong> connects generated discrete samples. It is not a unique original continuous signal.
              </span>
            ) : (
              <span>
                <strong>Continuous source:</strong> Samples are taken from the continuous signal <InlineMath math="x_c(t)" /> at <InlineMath math="t_g = g/f_s" />.
              </span>
            )}
          </div>
        )}

        {/* Dynamic Zoom Details Overlay (Main view indicator if zoomed) */}
        {zoom > 1 && (
          <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold">
            <span>Graph is horizontally scaled ({zoom.toFixed(2)}x). Pan or use scrollbar above to inspect samples sequentially.</span>
            <button 
              onClick={handleZoomReset}
              className="px-2 py-0.5 bg-white border border-amber-300 rounded font-bold cursor-pointer"
            >
              Reset view size
            </button>
          </div>
        )}

        {/* Frame Details Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-800 tracking-tight font-sans">
                  Extracted samples in active frame
                </h4>
                <div className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100 text-xs font-semibold shadow-3xs">
                  <InlineMath math={`I_{${selectedFrameM}} = \\left[${frameStart}, ${frameEndExcl}\\right)`} />
                </div>
              </div>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                This table shows how local frame positions <InlineMath math="\ell" /> map to global indices <InlineMath math="g" /> and sample values <InlineMath math="x[g]" />.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono table-fixed min-w-[600px]">
              <colgroup>
                <col className="w-56" />
                {Array.from({ length: L }).map((_, idx) => (
                  <col key={`col-spec-${idx}`} style={{ width: `${100 / L}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-150">
                  <th className="py-3 px-4 text-left font-sans font-semibold text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50/50 rounded-tl-xl">
                    Local Offset (<InlineMath math="\ell" />)
                  </th>
                  {Array.from({ length: L }).map((_, l) => {
                    const isSelected = l === selectedEll;
                    const isHovered = l === hoveredL;
                    return (
                      <th
                        key={`table-l-offset-${l}`}
                        onMouseEnter={() => setHoveredL(l)}
                        onMouseLeave={() => { setHoveredL(null); setTableTooltip(null); }}
                        onMouseMove={(e) => handleTableMouseMove(e, l)}
                        className={`p-3 text-center transition-colors duration-150 relative ${
                          isSelected
                            ? 'bg-blue-50/70 border-x border-blue-200 text-blue-700 font-bold'
                            : isHovered
                              ? 'bg-slate-50 border-x border-slate-100 text-slate-700'
                              : 'border-x border-transparent text-slate-600'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5 min-h-[36px]">
                          {isSelected ? (
                            <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider whitespace-nowrap">
                              selected <InlineMath math="\ell" />
                            </span>
                          ) : (
                            <span className="text-[9px] text-transparent select-none whitespace-nowrap">-</span>
                          )}
                          <span className={isSelected ? 'text-blue-700 font-bold text-sm' : 'text-slate-600'}>
                            <InlineMath math={`\\ell = ${l}`} />
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-150 leading-normal">
                  <td className="py-3.5 px-4 text-left font-sans font-semibold text-slate-705 bg-slate-50/50">
                    Global Coordinate (<InlineMath math="g" />)
                  </td>
                  {Array.from({ length: L }).map((_, l) => {
                    const gIdx = frameStart + l;
                    const isPlaybackCurrent = gIdx === playbackG;
                    const isSelected = l === selectedEll;
                    const isHovered = l === hoveredL;
                    return (
                      <td
                        key={`table-g-coord-${l}`}
                        onMouseEnter={() => setHoveredL(l)}
                        onMouseLeave={() => { setHoveredL(null); setTableTooltip(null); }}
                        onMouseMove={(e) => handleTableMouseMove(e, l)}
                        className={`py-3 px-3 text-center font-mono cursor-pointer transition-colors duration-150 ${
                          isSelected 
                            ? 'bg-blue-50 border-x border-blue-200 text-blue-800 font-bold shadow-3xs' 
                            : isHovered
                              ? 'bg-slate-50 border-x border-slate-100 text-slate-850 font-semibold'
                              : isPlaybackCurrent
                                ? 'bg-purple-50 text-purple-700 font-semibold border-x border-purple-100'
                                : 'text-slate-600 border-x border-transparent'
                        }`}
                        onClick={() => {
                          setPlaybackG(gIdx);
                          onSelectLocalIndex(l);
                        }}
                      >
                        <span className="tabular-nums text-sm">{gIdx}</span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="leading-normal">
                  <td className="py-3.5 px-4 text-left font-sans font-semibold text-slate-705 bg-slate-50/50 rounded-bl-xl">
                    Sample Value (<InlineMath math="x[g]" />)
                  </td>
                  {Array.from({ length: L }).map((_, l) => {
                    const gIdx = frameStart + l;
                    const val = signalValues[gIdx] ?? 0;
                    const isPlaybackCurrent = gIdx === playbackG;
                    const isSelected = l === selectedEll;
                    const isHovered = l === hoveredL;
                    return (
                      <td
                        key={`table-val-${l}`}
                        onMouseEnter={() => setHoveredL(l)}
                        onMouseLeave={() => { setHoveredL(null); setTableTooltip(null); }}
                        onMouseMove={(e) => handleTableMouseMove(e, l)}
                        className={`py-3.5 px-3 text-center font-mono cursor-pointer transition-colors duration-150 ${
                          isSelected 
                            ? 'bg-blue-50 border-x border-b border-blue-200 text-blue-700 font-bold' 
                            : isHovered
                              ? 'bg-slate-50 border-x border-b border-slate-100 text-slate-800'
                              : isPlaybackCurrent
                                ? 'bg-purple-50 text-purple-700 font-semibold border-x border-b border-purple-100'
                                : 'text-slate-600 border-x border-b border-transparent'
                        }`}
                        onClick={() => {
                          setPlaybackG(gIdx);
                          onSelectLocalIndex(l);
                        }}
                      >
                        <span className="tabular-nums text-sm">{val.toFixed(4)}</span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table hover tooltip portal */}
          {tableTooltip !== null && (
            <div
              style={{
                position: 'absolute',
                left: tableTooltip.x,
                top: tableTooltip.y,
                zIndex: 50,
              }}
              className="bg-slate-900 border border-slate-850 shadow-2xl rounded-xl p-3.5 text-white w-64 pointer-events-none select-none text-xs space-y-2.5 animate-in fade-in duration-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-sans">
                <span className="font-bold text-sky-400">Local Offset Info</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono flex items-center justify-center">
                  <InlineMath math={`\\ell = ${tableTooltip.l}`} />
                </span>
              </div>
              <div className="space-y-2 font-sans leading-normal">
                <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-805">
                  <span className="text-slate-400 text-[11px]">Local offset:</span>
                  <span className="font-semibold text-white">
                    <InlineMath math={`\\ell = ${tableTooltip.l}`} />
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-805">
                  <span className="text-slate-400 text-[11px]">Global index:</span>
                  <span className="font-semibold text-emerald-400">
                    <InlineMath math={`g = mH + \\ell = ${selectedFrameM} \\cdot ${H} + ${tableTooltip.l} = ${frameStart + tableTooltip.l}`} />
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-805">
                  <span className="text-slate-400 text-[11px]">Sample value:</span>
                  <span className="font-semibold text-amber-300">
                    <InlineMath math={`x^{(${selectedFrameM})}[${tableTooltip.l}] = x[${frameStart + tableTooltip.l}] = ${(signalValues[frameStart + tableTooltip.l] ?? 0).toFixed(4)}`} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Academic Mapping rule footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-600">
            <div className="flex items-center gap-1.5 text-xs font-sans">
              <span className="font-semibold text-slate-500">Mapping rule:</span>
              <InlineMath math={`x^{(m)}[\\ell] = x[mH + \\ell]`} />
            </div>
            
            <div className="flex items-center gap-2 text-xs font-sans bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200 shadow-3xs">
              <span className="text-slate-500 font-medium">Substituted selected values:</span>
              <InlineMath 
                math={`x^{(${selectedFrameM})}[${selectedEll}] = x[${selectedGlobalIndex}] = ${(selectedSampleValue ?? 0).toFixed(4)}`} 
                className="text-blue-700 font-bold font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN LIVE FOCUS MODAL */}
      {isExpanded && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-hidden animate-fade-in animate-duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="space-y-1">
                <span className="font-mono text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Textbook Focus Interactive Workspace & Signal Analyzer
                </span>
                <h3 className="text-base font-bold tracking-tight">Expandable Live Graph Analysis</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold flex items-center gap-1"
                title="Close focus mode (Esc)"
              >
                <Minimize2 size={16} /> Close Focus Mode (Esc)
              </button>
            </div>

            {/* Modal Workspace Panels */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Playback & interactive parameter synchronization status */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Visual playback widget */}
                <div className="md:col-span-8 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workspace Timing Controller</h4>
                  {renderPlaybackControls()}
                  {renderActivePlaybackReadout()}
                </div>

                {/* Physical Math status widget */}
                <div className="md:col-span-4 bg-slate-55 bg-slate-50/80 border border-slate-200 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Active Coordinates Map</h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Hop (H) size:</span>
                      <span className="font-extrabold">{H} samples</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Length (L) size:</span>
                      <span className="font-extrabold">{L} samples</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Total Size (N):</span>
                      <span className="font-extrabold">{N} samples</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-blue-600 font-sans font-bold">Selected Coordinate (g):</span>
                      <span className="font-bold text-blue-700">{selectedGlobalIndex}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-purple-700">
                      <span className="font-sans font-bold">Scanner Cursor (g_scan):</span>
                      <span className="font-bold">{playbackG}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Large High-Fidelity Signal Vector SVG Area */}
              <div className="space-y-2">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Linear Discrete Time Grid Display</h4>
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-sans tracking-wide">
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-blue-600"></span>
                        <span>Index: Equally spaced by g</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                        <span>Time: t_g = g/f_s</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Zoom controller panel requested for Expanded Mode */}
                  <div className="flex items-center gap-1.5 border border-slate-200 p-1 rounded-lg bg-white shadow-3xs self-start md:self-auto">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 1.0}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all cursor-pointer"
                      title="Zoom Out Graph Horizontal Scale"
                    >
                      <ZoomOut size={13} /> Zoom Out
                    </button>
                    <span className="px-2 font-mono text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded py-0.5">
                      {zoom.toFixed(2)}x
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 3.0}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all cursor-pointer"
                      title="Zoom In Graph Horizontal Scale"
                    >
                      <ZoomIn size={13} /> Zoom In
                    </button>
                    <button
                      onClick={handleZoomReset}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all cursor-pointer"
                      title="Reset view layout to fill the width"
                    >
                      <RefreshCw size={12} /> Fit all
                    </button>
                  </div>
                </div>

                {/* Scrollable large high-definition visualization container (minimum height at 540px as instructed) */}
                <div 
                  className="overflow-x-auto w-full border border-slate-200 rounded-2xl bg-slate-50/30 flex items-center p-3"
                  style={{ minHeight: '540px' }}
                >
                  <div className="mx-auto select-none w-full">
                    {renderSVGGraph(true)}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-sans text-center leading-relaxed">
                *While in expanded view workspace, modifications made to indices <InlineMath math="m" /> or <InlineMath math="\ell" /> via the sidebar will translate immediately onto this graph representation. Close study mode once finished inspecting individual samples.
              </p>

            </div>

            {/* Modal Bottom Status Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>Textbook Classroom Mode: {isSmallDemo ? 'Homework Preset (N=16)' : `Parameterized (N=${N}, f_s=${fs}Hz, L=${L}, H=${H})`}</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg cursor-pointer"
              >
                Close focus screen
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default SignalAxis;
