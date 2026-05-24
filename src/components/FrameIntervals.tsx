/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LabState, computeFrameInterval } from '../math/framing';
import { InlineMath, MathBlock, MathBadge } from './Math';
import { ZoomIn, ZoomOut, Maximize2, X, Check, AlertTriangle, RotateCcw } from 'lucide-react';

const toSubscript = (num: number): string => {
  const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return num
    .toString()
    .split('')
    .map(digit => {
      const d = parseInt(digit);
      return isNaN(d) ? digit : subs[d];
    })
    .join('');
};


interface FrameIntervalsProps {
  labState: LabState;
  onSelectFrame: (m: number) => void;
  setL?: (L: number) => void;
  setH?: (H: number) => void;
  setN?: (N: number) => void;
  setFs?: (fs: number) => void;
  isSmallDemo?: boolean;
  hoveredSymbol: string | null;
  setHoveredSymbol: (s: string | null) => void;
}

interface TooltipState {
  type: 'frame' | 'sample' | 'endpoint' | null;
  id?: number; // frame index m
  globalIndex?: number; // global index g
  coords: { x: number; y: number } | null;
}

export const FrameIntervals: React.FC<FrameIntervalsProps> = ({
  labState,
  onSelectFrame,
  setL,
  setH,
  setN,
  setFs,
  isSmallDemo = false,
}) => {
  const {
    N,
    L,
    H,
    M,
    selectedFrameM,
    fs,
  } = labState;

  // React states
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [tooltip, setTooltip] = useState<TooltipState>({ type: null, coords: null });
  const [hoveredFrameM, setHoveredFrameM] = useState<number | null>(null);
  const [showModalSidebar, setShowModalSidebar] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const modalDiagramRef = useRef<HTMLDivElement>(null);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute membership lists for hover
  const getMemberships = (g: number) => {
    const list: { m: number; localIdx: number }[] = [];
    for (let m = 0; m < M; m++) {
      const start = m * H;
      const endExcl = start + L;
      if (g >= start && g < endExcl) {
        list.push({ m, localIdx: g - start });
      }
    }
    return list;
  };

  // Determine skip indices (gaps) for N
  const getSkippedIndices = () => {
    const active = new Set<number>();
    for (let m = 0; m < M; m++) {
      const start = m * H;
      for (let l = 0; l < L; l++) {
        active.add(start + l);
      }
    }
    const skipped: number[] = [];
    for (let g = 0; g < N; g++) {
      if (!active.has(g)) {
        skipped.push(g);
      }
    }
    return skipped;
  };

  // Find consecutive ranges of skipped indices to display nicely
  const getSkippedRanges = () => {
    const skipped = getSkippedIndices();
    if (skipped.length === 0) return [];
    const ranges: { start: number; end: number }[] = [];
    let start = skipped[0];
    let prev = skipped[0];

    for (let i = 1; i < skipped.length; i++) {
      if (skipped[i] === prev + 1) {
        prev = skipped[i];
      } else {
        ranges.push({ start, end: prev + 1 });
        start = skipped[i];
        prev = skipped[i];
      }
    }
    ranges.push({ start, end: prev + 1 });
    return ranges;
  };

  const skippedRanges = getSkippedRanges();
  const skippedCount = getSkippedIndices().length;

  // Render Hover Tooltip
  const renderTooltipContent = () => {
    if (!tooltip.type || tooltip.coords === null) return null;

    if (tooltip.type === 'frame' && tooltip.id !== undefined) {
      const mIdx = tooltip.id;
      const s_m = mIdx * H;
      const endExcl = s_m + L;
      const incIndicesStr = Array.from({ length: L }, (_, i) => s_m + i).join(', ');

      return (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-md max-w-xs font-sans text-xs space-y-2 pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
            <span className="font-bold text-sky-400">Frame m = {mIdx}</span>
            <span className="text-[9.5px] text-slate-400 tracking-wider uppercase font-bold">Lane info</span>
          </div>
          <div className="space-y-1 text-[11px] leading-tight text-slate-300">
            <div>
              <span className="text-slate-400">Start offset: </span>
              <InlineMath math={`s_m = mH = ${mIdx} \\cdot ${H} = ${s_m}`} className="font-mono text-white" />
            </div>
            <div>
              <span className="text-slate-400">Interval: </span>
              <InlineMath math={`I_m = [${s_m}, ${endExcl})`} className="font-mono text-indigo-300 font-bold" />
            </div>
          </div>
          <div className="border-t border-slate-850 pt-1.5">
            <span className="text-slate-450 block mb-1 font-bold text-[9px] uppercase tracking-wider">Included global indices:</span>
            <div className="font-mono text-amber-300 text-[10.5px] bg-slate-950 p-1.5 rounded border border-slate-850 break-all leading-normal">
              <InlineMath math={`\\{${incIndicesStr}\\}`} />
            </div>
          </div>
        </div>
      );
    }

    if (tooltip.type === 'sample' && tooltip.globalIndex !== undefined) {
      const gIdx = tooltip.globalIndex;
      const memberships = getMemberships(gIdx);

      return (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-md max-w-xs font-sans text-xs space-y-2 pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
            <span className="font-bold text-emerald-400">Sample g = {gIdx}</span>
            <span className="text-[9.5px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono">x[{gIdx}]</span>
          </div>
          <div className="space-y-2">
            {memberships.length === 0 ? (
              <span className="text-red-400 font-bold block text-[11px]">Skipped sample: does not belong to any frame!</span>
            ) : (
              <div className="space-y-1.5">
                <span className="text-slate-450 block font-bold text-[9.5px] uppercase tracking-wider">Frame Memberships:</span>
                {memberships.map((mem) => {
                  const isSelectedMem = mem.m === selectedFrameM;
                  return (
                    <div
                      key={mem.m}
                      className={`flex items-center justify-between px-2 py-1 rounded border gap-3 ${
                        isSelectedMem 
                          ? 'bg-indigo-950/70 border-indigo-800 text-indigo-200 font-semibold' 
                          : 'bg-slate-950/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-[11px]">
                        Frame m = {mem.m} {isSelectedMem && ' (Active)'}
                      </span>
                      <span className="font-mono text-[10.5px] text-white">
                        <InlineMath math={`\\ell = ${mem.localIdx}`} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tooltip.type === 'endpoint' && tooltip.id !== undefined && tooltip.globalIndex !== undefined) {
      const mIdx = tooltip.id;
      const gIdx = tooltip.globalIndex;
      return (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-md max-w-xs font-sans text-xs space-y-2 pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
            <span className="font-bold text-red-400">Exclusive Endpoint</span>
            <span className="text-[9.5px] bg-red-950 px-1.5 py-0.5 rounded text-red-350 font-mono">Excl [{gIdx})</span>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-300 space-y-1">
            <div>
              <span className="text-slate-400">Boundary index: </span>
              <InlineMath math={`s_m + L = ${gIdx}`} className="font-mono text-white font-bold" />
            </div>
            <div>
              <span className="text-slate-400">Frame lane: </span>
              <span className="text-slate-100 font-semibold">m = {mIdx}</span>
            </div>
            <div className="text-[10px] text-red-400/95 italic pt-1 border-t border-slate-800/60 leading-tight">
              * The first sample index that is NOT extracted into Frame {mIdx}.
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Handle Tooltip Mouse tracking
  const handleMouseMove = (e: React.MouseEvent, type: 'frame' | 'sample' | 'endpoint', payload: any) => {
    const ref = isExpanded ? modalDiagramRef : diagramRef;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    
    // Calculate client mouse coordinates relative to the diagram's bounding rect
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Smart stable boundary clipping:
    const tooltipWidth = 240;
    const tooltipHeight = 150;
    
    let left = mouseX + 15;
    let top = mouseY + 15;
    
    // Check horizontal boundary: if overflow right scale, push to left
    if (left + tooltipWidth > rect.width) {
      left = mouseX - tooltipWidth - 15;
    }
    // Check bottom boundary
    if (top + tooltipHeight > rect.height) {
      top = mouseY - tooltipHeight - 15;
    }
    
    // Maintain minimum positive bounds
    left = Math.max(10, left);
    top = Math.max(10, top);

    setTooltip({
      type,
      coords: { x: left, y: top },
      ...payload,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ type: null, coords: null });
  };

  // Primary SVG Plot Generator helper
  const renderPrimaryDiagram = (isModal: boolean) => {
    const paddingLeft = 100; // Spacious left padding to make room for titles and brackets
    const paddingRight = 110; // Spacious right padding for the interval notation
    
    const svgWidth = 940;
    const plotWidth = svgWidth - paddingLeft - paddingRight;

    // Density-driven dynamic height distribution to eliminate dead spaces of static constants
    const baseSvgHeight = isModal ? 780 : 580;
    const framesStartY = isModal ? 110 : 85;
    const footerHeight = isModal ? 120 : 95;
    const availableHeightForLanes = baseSvgHeight - framesStartY - footerHeight;
    
    // Scale lane separator height perfectly with M so lanes look bold and utilize full height space
    const minRowHeight = isModal ? 55 : 46;
    let rowHeight = availableHeightForLanes / Math.max(3, M);
    if (rowHeight < minRowHeight) {
      rowHeight = minRowHeight;
    }
    const calculatedHeight = framesStartY + M * rowHeight + footerHeight;
    const axisY = 44;

    const getX = (g: number) => {
      if (N <= 0) return paddingLeft + plotWidth / 2;
      return paddingLeft + (g / N) * plotWidth;
    };

    // Calculate elegant scalable dot/boundary sizing based on N
    const dotRadius = N <= 16 ? 5.0 : N <= 32 ? 3.5 : N <= 64 ? 2.5 : N <= 128 ? 1.6 : 1.0;
    const dotRadiusActive = N <= 16 ? 7.5 : N <= 32 ? 5.5 : N <= 64 ? 3.8 : N <= 128 ? 2.4 : 1.5;
    const boundaryRadius = N <= 16 ? 6.5 : N <= 32 ? 4.8 : N <= 64 ? 3.2 : N <= 128 ? 2.2 : 1.4;

    const s_m_selected = selectedFrameM * H;
    const endExcl_selected = s_m_selected + L;

    // Overlap bounds calculation
    const overlaps: { start: number; end: number }[] = [];
    if (H < L && M > 1) {
      for (let m = 0; m < M - 1; m++) {
        const start = (m + 1) * H;
        const end = m * H + L;
        if (start < end) {
          overlaps.push({ start, end });
        }
      }
    }

    return (
      <div 
        ref={isModal ? modalDiagramRef : diagramRef}
        onMouseLeave={handleMouseLeave}
        className="relative bg-white border border-slate-200 rounded-xl overflow-auto select-none grow scrollbar-thin scrollbar-thumb-slate-350 scrollbar-track-transparent"
        style={{ height: isModal ? '790px' : '590px' }}
      >
        <svg
          id={isModal ? "expanded-frame-svg" : "standard-frame-svg"}
          viewBox={`0 0 ${svgWidth} ${calculatedHeight}`}
          width={isModal ? (zoomLevel === 1.0 ? "100%" : svgWidth * zoomLevel) : "100%"}
          height={isModal ? (zoomLevel === 1.0 ? undefined : calculatedHeight * zoomLevel) : undefined}
          className="overflow-visible select-none my-0 mx-auto"
        >
          {/* Definitions for arrow marks */}
          <defs>
            <marker id="hop-arrow-selected" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 Z" fill="#10b981" />
            </marker>
          </defs>

          {/* DYNAMIC BACKGROUND SHADING FOR GAPS / SKIPPED REGIONS (If H > L) */}
          {H > L && skippedRanges.map((range, idx) => {
            const x1 = getX(range.start);
            const x2 = getX(range.end);
            return (
              <g key={`gap-shading-${idx}`}>
                <rect
                  x={x1}
                  y={axisY - 14}
                  width={x2 - x1}
                  height={calculatedHeight - axisY - (isModal ? 30 : 20)}
                  fill="#fef3c7"
                  fillOpacity="0.22"
                />
                <line
                  x1={(x1 + x2) / 2}
                  y1={axisY - 10}
                  x2={(x1 + x2) / 2}
                  y2={calculatedHeight - (isModal ? 100 : 75)}
                  stroke="#d97706"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  strokeOpacity="0.35"
                />
              </g>
            );
          })}

          {/* DYNAMIC BACKGROUND SHADING FOR OVERLAP REGIONS (If H < L) */}
          {H < L && overlaps.map((range, idx) => {
            const x1 = getX(range.start);
            const x2 = getX(range.end);
            return (
              <rect
                key={`overlap-shading-${idx}`}
                x={x1}
                y={axisY - 14}
                width={x2 - x1}
                height={calculatedHeight - axisY - (isModal ? 30 : 20)}
                fill="#eff6ff"
                fillOpacity="0.3"
              />
            );
          })}

          {/* GLOBAL SIGNAL INDEX AXIS RULER (Y = axisY) */}
          {(() => {
            const axisYLocal = 44;
            return (
              <g>
                <line
                  x1={paddingLeft}
                  y1={axisYLocal}
                  x2={svgWidth - paddingRight}
                  y2={axisYLocal}
                  stroke="#334155"
                  strokeWidth="2"
                />
                
                {/* Title badge label above global scale */}
                <foreignObject
                  x={paddingLeft - 85}
                  y={axisYLocal - 16}
                  width="80"
                  height="30"
                  className="overflow-visible pointer-events-none"
                >
                  <div className="flex items-center justify-end font-sans text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pr-1.5 leading-none h-full">
                    <span>Global <InlineMath math="g" /></span>
                  </div>
                </foreignObject>

                {/* Main scale tickers */}
                {Array.from({ length: N + 1 }).map((_, g) => {
                  const gx = getX(g);
                  const isN = g === N;
                  const step = N <= 16 ? 1 : N <= 32 ? 2 : N <= 64 ? 4 : N <= 128 ? 8 : 16;
                  const shouldLabel = g % step === 0 || isN;

                  if (!shouldLabel) {
                    return (
                      <line
                        key={`axis-tick-sub-${g}`}
                        x1={gx}
                        y1={axisYLocal}
                        x2={gx}
                        y2={axisYLocal + 4}
                        stroke="#94a3b8"
                        strokeWidth="1"
                      />
                    );
                  }

                  return (
                    <g key={`axis-tick-${g}`}>
                      <line
                        x1={gx}
                        y1={axisYLocal}
                        x2={gx}
                        y2={axisYLocal + 7}
                        stroke="#1e293b"
                        strokeWidth="1.8"
                      />
                      <text
                        x={gx}
                        y={axisYLocal - 9}
                        fill={isN ? '#ef4444' : '#334155'}
                        fontSize="11.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {isN ? `N=${g}` : g}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical guides spanning from ticks down across lanes */}
                {Array.from({ length: N + 1 }).map((_, g) => {
                  const gx = getX(g);
                  const step = N <= 16 ? 2 : N <= 32 ? 4 : N <= 64 ? 8 : 16;
                  if (g % step !== 0 && g !== N) return null;

                  return (
                    <line
                      key={`v-guide-stem-${g}`}
                      x1={gx}
                      y1={axisYLocal + 8}
                      x2={gx}
                      y2={calculatedHeight - footerHeight + 10}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                      className="pointer-events-none"
                    />
                  );
                })}
              </g>
            );
          })()}

          {/* FRAME LANES LIST */}
          {Array.from({ length: M }).map((_, m) => {
            const isSelected = m === selectedFrameM;
            const isHovered = m === hoveredFrameM;
            const s_m = m * H;
            const endExcl = s_m + L;

            const xStart = getX(s_m);
            const xEnd = getX(endExcl);
            const yLoc = framesStartY + m * rowHeight + rowHeight * 0.5;

            const strokeColor = isSelected ? '#1d4ed8' : isHovered ? '#475569' : '#94a3b8';
            const laneBandFill = isSelected ? '#f5f9ff' : isHovered ? '#fcfdfe' : 'transparent';
            const strokeWidth = isSelected ? '3.5' : '1.8';

            return (
              <g
                key={`frame-lane-element-${m}`}
                onClick={() => onSelectFrame(m)}
                onMouseEnter={() => setHoveredFrameM(m)}
                onMouseLeave={() => {
                  setHoveredFrameM(null);
                  handleMouseLeave();
                }}
                onMouseMove={(e) => handleMouseMove(e, 'frame', { id: m })}
                className="cursor-pointer group transition-all duration-150"
              >
                {/* Full-width lane highlight runway */}
                <rect
                  x={12}
                  y={yLoc - rowHeight / 2}
                  width={svgWidth - 24}
                  height={rowHeight}
                  fill={laneBandFill}
                  stroke={isSelected ? '#dbeafe' : 'transparent'}
                  strokeWidth="1"
                  rx={6}
                  className="transition-colors duration-150"
                />

                {/* Left lane index indicator badge */}
                <g transform={`translate(${paddingLeft - 36}, ${yLoc})`}>
                  <rect
                    x="-24"
                    y="-11"
                    width="44"
                    height="22"
                    rx="5"
                    fill={isSelected ? '#1d4ed8' : '#f8fafc'}
                    stroke={isSelected ? '#1e40af' : '#cbd5e1'}
                    strokeWidth={isSelected ? '2' : '1'}
                    className="shadow-3xs"
                  />
                  <text
                    x="-2"
                    y="3.5"
                    fill={isSelected ? '#ffffff' : '#475569'}
                    fontSize={isModal ? "12" : "11"}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    m={m}
                  </text>
                </g>

                {/* Elegant active bracket highlights under segment */}
                <rect
                  x={xStart}
                  y={yLoc - (isSelected ? 10 : 8)}
                  width={xEnd - xStart}
                  height={isSelected ? 20 : 16}
                  fill={isSelected ? '#eff6ff' : '#f1f5f9'}
                  fillOpacity={isSelected ? '0.9' : '0.5'}
                  stroke={isSelected ? '#3b82f6' : '#e2e8f0'}
                  strokeWidth={isSelected ? '1.5' : '1'}
                  strokeDasharray={isSelected ? 'none' : '3 3'}
                  rx={4}
                />

                {/* Horizontal lane timeline trace */}
                <line
                  x1={xStart}
                  y1={yLoc}
                  x2={xEnd}
                  y2={yLoc}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />

                {/* Inclusive start physical bracket symbol '[' */}
                <path
                  d={`M ${xStart + 7} ${yLoc - (isSelected ? 11 : 9)} L ${xStart} ${yLoc - (isSelected ? 11 : 9)} L ${xStart} ${yLoc + (isSelected ? 11 : 9)} L ${xStart + 7} ${yLoc + (isSelected ? 11 : 9)}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? '3.5' : '1.8'}
                />

                {/* Exclusive end physical parenthesis symbol ')' */}
                <path
                  d={`M ${xEnd - 7} ${yLoc - (isSelected ? 11 : 9)} Q ${xEnd} ${yLoc} ${xEnd - 7} ${yLoc + (isSelected ? 11 : 9)}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? '3.5' : '1.8'}
                />

                {/* Explicit Vertical fence bar at exclusive boundary */}
                <line
                  x1={xEnd}
                  y1={yLoc - (isSelected ? 8 : 6)}
                  x2={xEnd}
                  y2={yLoc + (isSelected ? 8 : 6)}
                  stroke={isSelected ? '#ef4444' : '#94a3b8'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                />

                {/* Discrete sample dots inside the sampling interval */}
                {Array.from({ length: L }).map((_, lIdx) => {
                  const currG = s_m + lIdx;
                  if (currG >= N) return null; // clamp bounds

                  const dx = getX(currG);
                  const isSampleSelectedGlobal = currG === labState.selectedGlobalIndex && isSelected;

                  const memberships = getMemberships(currG);
                  const belongsToMultiple = memberships.length > 1;

                  return (
                    <g key={`sample-group-${m}-${currG}`}>
                      {/* Interactive dot */}
                      <circle
                        cx={dx}
                        cy={yLoc}
                        r={isSelected ? (isSampleSelectedGlobal ? dotRadiusActive + 2 : dotRadiusActive) : isHovered ? dotRadius + 1.2 : dotRadius}
                        fill={
                          isSelected
                            ? '#1d4ed8' // Strong vibrant blue
                            : belongsToMultiple
                            ? '#0284c7' // Soft teal for overlaps
                            : '#64748b' // Standby slate
                        }
                        stroke={
                          isSampleSelectedGlobal
                            ? '#ffffff'
                            : belongsToMultiple
                            ? '#e0f2fe'
                            : 'none'
                        }
                        strokeWidth={isSampleSelectedGlobal ? '2.5' : '1'}
                        className="transition-all duration-150"
                        onMouseMove={(e) => {
                          e.stopPropagation();
                          handleMouseMove(e, 'sample', { globalIndex: currG });
                        }}
                        onMouseLeave={handleMouseLeave}
                      />

                      {/* Micro local index tag label printed right under each dot for educational clarity */}
                      {isSelected && L <= 16 && (
                        <text
                          x={dx}
                          y={yLoc + 21}
                          fill="#1d4ed8"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none select-none opacity-85"
                        >
                          {lIdx}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* ACCENT EXCLUSIVE BOUNDARY TERMINAL POINT (s_m + L) */}
                <g className="transition-all duration-150">
                  {/* Distinct hollow red/grey marker with central 'X' */}
                  <circle
                    cx={xEnd}
                    cy={yLoc}
                    r={isSelected ? boundaryRadius + 1.5 : boundaryRadius}
                    fill="#ffffff"
                    stroke={isSelected ? "#ef4444" : "#94a3b8"}
                    strokeWidth={isSelected ? 2 : 1.2}
                    strokeDasharray={isSelected ? "none" : "2 2"}
                    className="cursor-pointer"
                    onMouseMove={(e) => {
                      e.stopPropagation();
                      handleMouseMove(e, 'endpoint', { id: m, globalIndex: endExcl });
                    }}
                    onMouseLeave={handleMouseLeave}
                  />
                  <path
                    d={isSelected 
                      ? `M ${xEnd - 3} ${yLoc - 3} L ${xEnd + 3} ${yLoc + 3} M ${xEnd + 3} ${yLoc - 3} L ${xEnd - 3} ${yLoc + 3}`
                      : `M ${xEnd - 2.5} ${yLoc - 2.5} L ${xEnd + 2.5} ${yLoc + 2.5} M ${xEnd + 2.5} ${yLoc - 2.5} L ${xEnd - 2.5} ${yLoc + 2.5}`
                    }
                    stroke={isSelected ? "#ef4444" : "#94a3b8"}
                    strokeWidth={isSelected ? 2 : 1.2}
                    className="pointer-events-none"
                  />

                  {/* Red label describing excluded boundary index: positioned above to avoid collisions with sample dots/labels below */}
                  {isSelected && (
                    <text
                      x={xEnd}
                      y={yLoc - 14}
                      fill="#ef4444"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="extrabold"
                      textAnchor="middle"
                    >
                      {L <= 4 ? `${endExcl}` : `${endExcl} (Excl)`}
                    </text>
                  )}
                </g>

                {/* ADORNING KEY PARAMETER DIMENSIONS ON ACTIVE LANE */}
                {isSelected && (
                  <g className="pointer-events-none">
                    {/* Beautiful straight Dimension Line Bracket (L) Above Lane */}
                    <path
                      d={`M ${xStart + 3} ${yLoc - 20} L ${xStart + 3} ${yLoc - 26} L ${xEnd - 3} ${yLoc - 26} L ${xEnd - 3} ${yLoc - 20}`}
                      fill="none"
                      stroke="#1d4ed8"
                      strokeWidth="1.5"
                    />
                    <g transform={`translate(${(xStart + xEnd) / 2}, ${yLoc - 26})`}>
                      <rect
                        x={L <= 3 ? "-20" : "-36"}
                        y="-9"
                        width={L <= 3 ? "40" : "72"}
                        height="18"
                        rx="4"
                        fill="#1d4ed8"
                        className="shadow-2xs"
                      />
                      <text
                        x="0"
                        y="1"
                        fill="#ffffff"
                        fontSize="9.5"
                        fontFamily="sans-serif"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {L <= 3 ? `L=${L}` : `L = ${L} (Len)`}
                      </text>
                    </g>

                    {/* Left start offset anchor label: offset horizontally on the left of xStart to be 100% collision-free. Hidden when s_m=0 (aligned with 0 tick) to prevent badge overlaps. */}
                    {s_m > 0 && (
                      <text
                        x={xStart - 9}
                        y={yLoc + 3.5}
                        fill="#1e40af"
                        fontSize="10"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        s{toSubscript(m)} = {s_m}
                      </text>
                    )}
                  </g>
                )}

                {/* Explicit Local interval set coordinates label on the right */}
                <text
                  x={svgWidth - paddingRight + 16}
                  y={yLoc + 3.5}
                  fill={isSelected ? '#1d4ed8' : '#475569'}
                  fontSize={isModal ? "12" : "11"}
                  fontFamily="monospace"
                  fontWeight={isSelected ? 'bold' : '500'}
                  textAnchor="start"
                >
                  [{s_m}, {endExcl})
                </text>
              </g>
            );
          })}

          {/* DYNAMIC HOP INDICATOR DIMENSION BETWEEN SELECTED ROW AND NEXT ROW */}
          {M > 1 && selectedFrameM < M - 1 && (() => {
            const nextSM = (selectedFrameM + 1) * H;
            const xStartH = getX(selectedFrameM * H);
            const xEndH = getX(nextSM);
            const yLocSelected = framesStartY + selectedFrameM * rowHeight + rowHeight * 0.5;
            const yLocNext = framesStartY + (selectedFrameM + 1) * rowHeight + rowHeight * 0.5;

            // Draw a beautiful curved/slanted link showing hop translation
            const controlX = (xStartH + xEndH) / 2 - 15;
            const controlY = (yLocSelected + yLocNext) / 2;

            return (
              <g key="hop-connection-premium" className="pointer-events-none">
                <path
                  d={`M ${xStartH} ${yLocSelected + 9} Q ${controlX} ${controlY} ${xEndH} ${yLocNext - 9}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  markerEnd="url(#hop-arrow-selected)"
                />
                <g transform={`translate(${(xStartH + xEndH) / 2}, ${(yLocSelected + yLocNext) / 2})`}>
                  <rect
                    x="-42"
                    y="-10"
                    width="84"
                    height="19"
                    rx="4"
                    fill="#10b981"
                    className="shadow-3xs"
                  />
                  <text
                    x="0"
                    y="0.5"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontFamily="sans-serif"
                    fontWeight="extrabold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    Hop H = {H}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* ACADEMIC MATHEMATICS CALLOUT CARD AT THE BOTTOM */}
          {(() => {
            const yOffset = calculatedHeight - footerHeight + 18;
            const cardHeight = footerHeight - 28;
            return (
              <g transform={`translate(${paddingLeft}, ${yOffset})`}>
                <rect
                  x={0}
                  y={0}
                  width={plotWidth}
                  height={cardHeight}
                  rx={10}
                  fill="#fafbfc"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />
                
                {/* Embed proper equation labels using SVG ForeignObject so they look elegant */}
                <foreignObject
                  x={15}
                  y={6}
                  width={plotWidth - 30}
                  height={cardHeight - 12}
                  className="overflow-visible pointer-events-none"
                >
                  <div className="flex flex-col justify-between h-full font-sans text-xs text-slate-600 leading-tight">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1 mr-1">
                      <span className="font-extrabold uppercase tracking-wider text-slate-500 text-[10px]">Active teaching readout (Frame {selectedFrameM})</span>
                      <span className="text-[10px] text-slate-400 font-medium font-sans italic">*Bracket <InlineMath math="]" /> is exclusive: index <InlineMath math="s_m + L" /> contains no samples.</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-0.5">
                      {/* Col 1 */}
                      <div className="flex flex-col leading-normal justify-center border-r border-slate-200/40 pr-2">
                        <span className="text-[9.5px] uppercase font-bold text-slate-400">Offset start point</span>
                        <div className="text-slate-800 font-bold font-mono mt-0.5 select-all">
                          <InlineMath math={`s_{${selectedFrameM}} = m \\cdot H = ${selectedFrameM} \\cdot ${H} = ${s_m_selected}`} />
                        </div>
                      </div>

                      {/* Col 2 */}
                      <div className="flex flex-col leading-normal justify-center border-r border-slate-200/40 px-2">
                        <span className="text-[9.5px] uppercase font-bold text-slate-400">Mathematical interval</span>
                        <div className="text-indigo-800 font-bold font-mono mt-0.5 select-all">
                          <InlineMath math={`I_{${selectedFrameM}} = [${s_m_selected}, ${endExcl_selected})`} />
                        </div>
                      </div>

                      {/* Col 3 */}
                      <div className="flex flex-col leading-normal justify-center pl-2">
                        <span className="text-[9.5px] uppercase font-bold text-slate-400">Included discrete indices</span>
                        <div className="text-blue-700 font-bold font-mono mt-0.5 select-all text-[11px] truncate">
                          <InlineMath math={`\\{${Array.from({ length: Math.min(6, L) }, (_, i) => s_m_selected + i).join(', ')}${L > 6 ? ', \\dots' : ''}\\}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })()}
        </svg>

        {/* Dynamic HTML Tooltip Overlay inside absolute layer */}
        {(isModal === isExpanded) && tooltip.type && tooltip.coords && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.coords.x,
              top: tooltip.coords.y,
              zIndex: 100,
            }}
            className="transition-all pointer-events-none"
          >
            {renderTooltipContent()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 relative"
      id="step-2-intervals-dashboard"
    >
      {/* Step 2 Diagram Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 font-sans">
               Frame Index Extraction
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
            Frame index <InlineMath math="m" /> maps into a sequence of global samples defined by start position <InlineMath math="s_m = mH" /> over span <InlineMath math="L" />. Hover on samples or lanes to analyze frame boundaries.
          </p>
        </div>

        {/* Status badges and Modal expansion triggers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {H === L ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-100 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              H = L (Non-overlapping)
            </span>
          ) : H < L ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-50 rounded-full border border-blue-100 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              H &lt; L (Overlapping)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 rounded-full border border-amber-100 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              H &gt; L (Gaps / {skippedCount} skipped)
            </span>
          )}

          <button
            type="button"
            id="btn-expand-frame-diagram"
            onClick={() => {
              setZoomLevel(1.0);
              setIsExpanded(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-all shadow-3xs cursor-pointer bg-white"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expand frame diagram</span>
          </button>
        </div>
      </div>

      {M === 0 ? (
        <div className="p-8 text-center border mr-2 border-red-100 bg-red-50/50 rounded-xl text-red-600 text-sm flex flex-col items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <span className="font-bold">Invalid Parameter Set</span>
          <span>
            Signal length <InlineMath math="N" /> is too small compared to frame size <InlineMath math="L" /> to extract any complete frames. <InlineMath math="N \ge L" /> is required.
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col space-y-4">
            
            {/* Unified horizontal selected frame summary bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 items-stretch shadow-3xs">
              
              {/* Block 1: Active frame index */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between transition-colors hover:border-indigo-100">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Active frame index
                </span>
                <div className="flex-1 flex items-center justify-center my-1.5 min-h-[42px]">
                  <InlineMath math={`m = ${selectedFrameM}`} className="text-base font-bold text-indigo-750" />
                </div>
                <span className="text-[10px] text-slate-400 text-center font-medium leading-none">
                  Focus lane frame index
                </span>
              </div>

              {/* Block 2: Offset definition */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between transition-colors hover:border-indigo-100">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Offset definition
                </span>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 my-1.5 min-h-[42px]">
                  <InlineMath math={`s_m = mH`} className="text-[10.5px] text-slate-500 font-medium" />
                  <InlineMath math={`s_{${selectedFrameM}} = ${selectedFrameM} \\cdot ${H} = ${selectedFrameM * H}`} className="text-[12.5px] font-bold text-slate-800" />
                </div>
                <span className="text-[10px] text-slate-400 text-center font-medium leading-none">
                  Offset starts at sample <span className="font-mono text-indigo-805 font-bold">{selectedFrameM * H}</span>
                </span>
              </div>

              {/* Block 3: Interval coordinates */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between transition-colors hover:border-indigo-100">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Interval coordinates
                </span>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 my-1.5 min-h-[42px]">
                  <InlineMath math={`I_m = [s_m, s_m + L)`} className="text-[10.5px] text-slate-500 font-medium" />
                  <InlineMath math={`I_{${selectedFrameM}} = [${selectedFrameM * H}, ${selectedFrameM * H + L})`} className="text-[12.5px] font-bold text-slate-800" />
                </div>
                <span className="text-[10px] text-slate-400 text-center font-medium leading-none">
                  Contains exactly <span className="font-semibold text-indigo-850 font-bold">{L} samples</span>
                </span>
              </div>

              {/* Block 4: Safety checklist */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between transition-colors hover:border-indigo-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Safety checklist
                  </span>
                  {selectedFrameM * H + L <= N ? (
                    <span className="inline-flex px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 rounded border border-emerald-100 font-sans leading-none">
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex px-1.5 py-0.5 text-[9.5px] font-bold text-red-750 bg-red-50 rounded border border-red-100 font-sans leading-none animate-pulse">
                      Exceeded
                    </span>
                  )}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 my-1.5 min-h-[42px]">
                  <InlineMath math={`s_m + L \\le N`} className="text-[10.5px] text-slate-500 font-medium" />
                  <InlineMath math={`${selectedFrameM * H} + ${L} \\le ${N} \\implies ${selectedFrameM * H + L} \\le ${N}`} className="text-[11.5px] font-bold text-slate-800" />
                </div>
                <span className="text-[10px] text-slate-400 text-center font-medium leading-none">
                  {selectedFrameM * H + L <= N ? (
                    <span className="text-emerald-700 font-bold">✓ Safe bounds limits</span>
                  ) : (
                    <span className="text-red-650 font-semibold">✕ Frame is clipped</span>
                  )}
                </span>
              </div>
            </div>

            {/* Polished interactive control toolbar right above the graph */}
            <div className="bg-slate-50 border border-slate-205 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-3xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] font-sans">
                  Active Focus Lane Controller
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">m = {selectedFrameM} / {Math.max(0, M - 1)}</span>
              </div>

              <div className="flex-1 max-w-md flex items-center gap-3">
                <button
                  type="button"
                  disabled={selectedFrameM === 0}
                  onClick={() => onSelectFrame(selectedFrameM - 1)}
                  className="p-1 px-3 bg-white border border-slate-220 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded transition-colors text-xs font-bold cursor-pointer font-sans select-none shrink-0"
                >
                  ← Back
                </button>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, M - 1)}
                  value={selectedFrameM}
                  onChange={(e) => onSelectFrame(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-205 rounded-lg cursor-pointer accent-indigo-600"
                  title="Slide to pivot selected frame focus lane"
                />
                <button
                  type="button"
                  disabled={selectedFrameM === M - 1}
                  onClick={() => onSelectFrame(selectedFrameM + 1)}
                  className="p-1 px-3 bg-white border border-slate-220 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded transition-colors text-xs font-bold cursor-pointer font-sans select-none shrink-0"
                >
                  Next →
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans shrink-0 text-right">
                Fit Mode: 1.0x
              </div>
            </div>

            {/* Premium Vector Canvas */}
            <div className="flex flex-col space-y-1">
              {renderPrimaryDiagram(false)}
            </div>

          </div>

          {/* TABLE OF EXTRACTED FRAME DETAILS  */}
          <div className="space-y-2">
            <h4 className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase font-sans">
              Frame Extraction Table
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider font-sans">
                    <th className="py-2.5 px-4 text-center w-24">Frame m</th>
                    <th className="py-2.5 px-4 text-center w-40">Start Offset (s_m = mH)</th>
                    <th className="py-2.5 px-4 w-52">Half-Open Interval</th>
                    <th className="py-2.5 px-4">Discrete Included Set</th>
                    <th className="py-2.5 px-4 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {Array.from({ length: M }).map((_, mIdx) => {
                    const isSelected = mIdx === selectedFrameM;
                    const s_m = mIdx * H;
                    const endExcl = s_m + L;
                    const indices = Array.from({ length: L }, (_, i) => s_m + i);
                    const roundedIndicesStr = `{${indices.join(', ')}}`;

                    return (
                      <tr
                        key={`table-row-${mIdx}`}
                        onClick={() => onSelectFrame(mIdx)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600 font-semibold text-blue-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold font-sans">
                          {mIdx}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {s_m}
                        </td>
                        <td className="py-3.5 px-4 text-indigo-700 font-semibold">
                          [{s_m}, {endExcl})
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-sm truncate text-[11px]" title={roundedIndicesStr}>
                          {roundedIndicesStr}
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans">
                          {isSelected ? (
                            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                              active
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                              valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN EXPANDED FOCUS MODE MODAL */}
      {isExpanded && (
        <div 
          ref={modalContainerRef}
          className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-8 select-none"
        >
          <div className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-150">
            
            {/* Modal Header bar */}
            <div className="bg-slate-900 text-white py-4.5 px-6 flex items-center justify-between border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                  <span>Interactive Frame Extraction Studio</span>
                  <span className="text-[10px] bg-slate-800 text-sky-400 font-mono font-bold px-2 py-0.5 rounded border border-slate-750">
                    Live Analyzer
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Analyze framing, overlap bounds, and multi-frame sample memberships under microscopic scale.
                </p>
              </div>

              {/* Central control row containing zoom modifiers */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                    title="Zoom Out"
                    className="p-1 px-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Zoom Out</span>
                  </button>
                  <span className="text-[11.5px] font-mono font-bold px-2 text-slate-300 select-none">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.25))}
                    title="Zoom In"
                    className="p-1 px-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1.0)}
                    title="Reset to Screen Width (Fit All)"
                    className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1.0)}
                    title="Fit All Frames in Viewport"
                    className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fit All</span>
                  </button>
                </div>

                {/* Collapse Sidebar toggler */}
                <button
                  type="button"
                  onClick={() => setShowModalSidebar(prev => !prev)}
                  className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors rounded-lg font-sans h-[32px] overflow-hidden shrink-0"
                  title={showModalSidebar ? "Collapse local inputs panel to maximize canvas" : "Expand local inputs panel for sliders"}
                >
                  <span>{showModalSidebar ? "Collapse Sidebar ⇥" : "Expand Sidebar ⇤"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal main workspace */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
              
              {/* Left Workspace Column: Wide Zoomable interactive canvas */}
              <div className={`${showModalSidebar ? 'lg:col-span-9' : 'lg:col-span-12'} flex flex-col p-6 overflow-hidden h-full`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-bold font-sans uppercase tracking-widest">
                    Microscopic vector interval map (Height: min 700px)
                  </span>
                  <div className="text-[10.5px] text-slate-400 font-mono">
                    Slide horizontal lanes & hover specimens to review relationships.
                  </div>
                </div>
                
                <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner p-1.5 relative flex flex-col justify-center">
                  {renderPrimaryDiagram(true)}
                </div>
                
                {/* Visual guideline callout card */}
                <div className="mt-4 bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-650 flex items-start gap-2.5 font-sans leading-relaxed">
                  <div className="bg-slate-200 text-slate-800 text-center font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    i
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Visualization Rules:</span> Overlapping sample spaces are shaded in <span className="text-blue-700 font-bold">blue vertical bands</span>. Frame extraction void spaces / skipped indices are shaded in <span className="text-amber-800 font-bold font-semibold">amber vertical bands</span>. Click on lanes to dynamically pivot focus. Scroll inside canvas to pan when zoomed in.
                  </div>
                </div>
              </div>

              {/* Right Column Workspace (Col-3): Live modifiers and calculations deck */}
              {showModalSidebar && (
                <div className="lg:col-span-3 border-l border-slate-250 bg-white shadow-2xs p-6 overflow-y-auto flex flex-col gap-5">
                
                {/* Parameter inputs inside the focus modal */}
                <div className="bg-slate-50 border border-slate-205 rounded-xl p-4.5 space-y-4 shadow-3xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-extrabold text-slate-700 tracking-wide uppercase font-sans">
                      Lab Parameters
                    </span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-sans px-2 py-0.5 rounded font-bold">
                       Modifiable
                    </span>
                  </div>

                  {isSmallDemo ? (
                    <p className="text-xs text-slate-500 font-sans italic leading-normal">
                      Demo mode locks parameters to lock step-by-step small data examples. Lock is active on N=16, L=4, H=4.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Active Frame m slider */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-bold text-slate-600 flex items-center gap-1 font-sans">
                            Selected Frame <InlineMath math="m" />
                          </span>
                          <span className="font-mono text-blue-700 font-extrabold text-xs">m = {selectedFrameM} / {M - 1}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={Math.max(0, M - 1)}
                          value={selectedFrameM}
                          onChange={(e) => onSelectFrame(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-205 rounded-lg cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* L length slider */}
                      {setL && (
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1 font-sans">
                              Frame length <InlineMath math="L" />
                            </span>
                            <span className="font-mono text-slate-800 font-bold">{L} samples</span>
                          </div>
                          <input
                            type="range"
                            min="4"
                            max={Math.max(4, N)}
                            value={L}
                            onChange={(e) => setL(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-205 rounded-lg cursor-pointer accent-slate-700"
                          />
                        </div>
                      )}

                      {/* H hop slider */}
                      {setH && (
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1 font-sans">
                              Hop size <InlineMath math="H" />
                            </span>
                            <span className="font-mono text-slate-800 font-bold">{H} samples</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max={L + 8} // allow tweaking H in both modes
                            value={H}
                            onChange={(e) => setH(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-205 rounded-lg cursor-pointer accent-slate-700"
                          />
                        </div>
                      )}

                      {/* N size slider */}
                      {setN && (
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1 font-sans">
                              Signal size <InlineMath math="N" />
                            </span>
                            <span className="font-mono text-slate-800 font-bold">{N} samples</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="128"
                            value={N}
                            onChange={(e) => setN(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-205 rounded-lg cursor-pointer accent-slate-700"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mathematical calculation card */}
                <div className="bg-slate-50 border border-slate-205 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase border-b border-slate-200 pb-2">
                    Equations & Sets
                  </h4>

                  <div className="text-xs space-y-3.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Offset Formula (s_m)</span>
                      <MathBlock math={`s_{${selectedFrameM}} = m \\cdot H = ${selectedFrameM} \\cdot ${H} = ${selectedFrameM * H}`} className="py-1 bg-white border border-slate-105 rounded p-1 text-center font-mono shadow-3xs" />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Physical Interval Definition</span>
                      <MathBlock math={`I_{${selectedFrameM}} = [s_m, s_m + L) = [${selectedFrameM * H}, ${selectedFrameM * H + L})`} className="py-1 bg-white border border-slate-105 rounded p-1 text-center font-mono shadow-3xs" />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Discrete Sample Set</span>
                      <div className="p-2 border border-slate-105 rounded bg-white text-center font-mono font-bold text-blue-700 text-xs overflow-x-auto shadow-3xs">
                        {`{ ${Array.from({ length: L }, (_, i) => selectedFrameM * H + i).join(', ')} }`}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-205">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Condition Checklist</span>
                      {selectedFrameM * H + L <= N ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-sans">
                          <InlineMath math="s_m + L \le N" />
                          <span>✓</span>
                        </span>
                      ) : (
                        <span className="text-red-750 font-bold text-[11px] bg-red-50 px-2.5 py-1 rounded border border-red-205 animate-pulse font-sans">
                          Exceeds Bounds ✕
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal lane index selector checklist */}
                <div className="space-y-2 flex-1 flex flex-col overflow-hidden max-h-[260px]">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">
                    Fast Lane Picker
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-y-auto bg-white shadow-3xs flex-1">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[9.5px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Lane</th>
                          <th className="py-2 px-3">Interval [s_m, s_m+L)</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {Array.from({ length: M }).map((_, mIdx) => {
                          const isSel = mIdx === selectedFrameM;
                          const s_m = mIdx * H;
                          return (
                            <tr
                              key={`modal-tbl-row-${mIdx}`}
                              onClick={() => onSelectFrame(mIdx)}
                              className={`cursor-pointer transition-colors duration-150 ${
                                isSel ? 'bg-blue-50/70 font-bold text-blue-800' : 'text-slate-605 hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-sans">
                                m = {mIdx}
                              </td>
                              <td className="py-2.5 px-3">
                                [{s_m}, {s_m + L})
                              </td>
                              <td className="py-2.5 px-3 text-center font-sans">
                                {isSel ? (
                                  <span className="bg-blue-100 text-blue-850 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                    active
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.2 rounded font-sans">
                                    valid
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FrameIntervals;
