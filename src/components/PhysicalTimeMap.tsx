/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { LabState } from '../math/framing';
import { InlineMath, MathBlock, MathBadge } from './Math';
import { 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X, 
  Clock, 
  Compass, 
  Activity, 
  GitCommit, 
  CalendarRange,
  Info 
} from 'lucide-react';

interface PhysicalTimeMapProps {
  labState: LabState;
  isSmallDemo: boolean;
}

export const PhysicalTimeMap: React.FC<PhysicalTimeMapProps> = ({
  labState,
  isSmallDemo,
}) => {
  const {
    fs,
    L,
    H,
    selectedFrameM,
    selectedEll,
  } = labState;

  // Deriving variables
  const startIdx = selectedFrameM * H;
  const lastSampleIdx = startIdx + L - 1;
  const boundaryIdx = startIdx + L;

  const tStart = startIdx / fs;
  const tLastSample = lastSampleIdx / fs;
  const tBoundary = boundaryIdx / fs;
  const tFrame = L / fs;
  const tHop = H / fs;
  const tSamplePeriod = 1 / fs;

  // Component local states for modal interaction & zoom controls
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFitInterval, setIsFitInterval] = useState(true);

  // Hover point tooltip representation state
  const [hoveredPoint, setHoveredPoint] = useState<{
    type: 'start' | 'end' | 'sample';
    g?: number;
    l?: number;
    t: number;
    x: number;
    y: number;
  } | null>(null);

  // Container refs for offset coordinate tooltip computations
  const wrapperRef = useRef<HTMLDivElement>(null);
  const modalWrapperRef = useRef<HTMLDivElement>(null);

  // Esc key handler 
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Handle live scale reset when fit triggers
  useEffect(() => {
    if (isFitInterval) {
      setZoomScale(1.0);
    }
  }, [isFitInterval]);

  // Adjust zoomScale dynamically while turning off direct fit constraints
  const handleZoom = (direction: 'in' | 'out') => {
    setIsFitInterval(false);
    setZoomScale(prev => {
      if (direction === 'in') return Math.min(2.5, prev + 0.25);
      return Math.max(0.65, prev - 0.25);
    });
  };

  // Safe handler to position the bubble tooltips
  const handleHover = (
    point: { type: 'start' | 'end' | 'sample'; g?: number; l?: number; t: number; x: number; y: number },
    e: React.MouseEvent,
    isModal: boolean
  ) => {
    const activeRef = isModal ? modalWrapperRef.current : wrapperRef.current;
    if (!activeRef) return;
    
    const rect = activeRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setHoveredPoint({
      ...point,
      x: mouseX,
      y: mouseY,
    });
  };

  const handleHoverLeave = () => {
    setHoveredPoint(null);
  };

  // Safe dynamic X calculation inside the timeline viewport coordinates (canvas coordinate system base limit 1000)
  const getX = (l: number, currentZoom: number) => {
    const fraction = l / L;
    const paddingLeft = 140;
    const paddingRight = 140;
    const baseActiveWidth = 1000 - paddingLeft - paddingRight;
    return paddingLeft + fraction * baseActiveWidth * currentZoom;
  };

  // Helper to map out decimation for tick density on large timelines
  const getTickStep = () => {
    if (L > 32) return 8;
    if (L > 16) return 4;
    if (L > 8) return 2;
    return 1;
  };

  // Render main timeline card element
  const renderTimelineSVG = (isModal: boolean) => {
    const currentZoom = isModal ? zoomScale : 1.0;
    const currentSvgWidth = 1000 * currentZoom;
    const svgHeight = isModal ? 480 : 380;
    const timelineY = isModal ? 240 : 190;
    const activeRef = isModal ? modalWrapperRef : wrapperRef;

    return (
      <div 
        ref={activeRef}
        className="w-full overflow-x-auto relative rounded-xl border border-slate-200/90 bg-slate-50/50 custom-scrollbar p-1 shadow-3xs"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar {
            height: 7px;
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
          className="overflow-visible mx-auto select-none bg-white transition-all duration-150"
        >
          {/* Defined textures and linear gradients for textbook styled components */}
          <defs>
            <linearGradient id="frameIntervalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="selectedSampleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {/* Shaded background representing continuous interval span */}
          <rect
            x={getX(0, currentZoom)}
            y={timelineY - 30}
            width={getX(L, currentZoom) - getX(0, currentZoom)}
            height={60}
            fill="url(#frameIntervalGrad)"
            stroke="#93c5fd"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            rx="6"
            className="transition-all duration-300"
          />

          {/* Continuous Infinite Physical Time horizontal axis line */}
          <line
            x1={40}
            y1={timelineY}
            x2={currentSvgWidth - 40}
            y2={timelineY}
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Inclusive Start Bracket [ visually signaling physical span endpoints */}
          <path
            d={`M ${getX(0, currentZoom) + 12} ${timelineY - 30} L ${getX(0, currentZoom)} ${timelineY - 30} L ${getX(0, currentZoom)} ${timelineY + 30} L ${getX(0, currentZoom) + 12} ${timelineY + 30}`}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Exclusive End Parenthesis ) visually signaling un-sampled physical boundaries */}
          <path
            d={`M ${getX(L, currentZoom) - 8} ${timelineY - 30} Q ${getX(L, currentZoom) + 6} ${timelineY} ${getX(L, currentZoom) - 8} ${timelineY + 30}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Double-ended marker line displaying physical Frame Duration */}
          <g>
            <line 
              x1={getX(0, currentZoom)} 
              y1={timelineY - 45} 
              x2={getX(L, currentZoom)} 
              y2={timelineY - 45} 
              stroke="#3b82f6" 
              strokeWidth="1.5" 
              strokeDasharray="2 2" 
            />
            <line x1={getX(0, currentZoom)} y1={timelineY - 49} x2={getX(0, currentZoom)} y2={timelineY - 41} stroke="#3b82f6" strokeWidth="1.5" />
            <line x1={getX(L, currentZoom)} y1={timelineY - 49} x2={getX(L, currentZoom)} y2={timelineY - 41} stroke="#3b82f6" strokeWidth="1.5" />
            
            <rect 
              x={(getX(0, currentZoom) + getX(L, currentZoom)) / 2 - 50} 
              y={timelineY - 56} 
              width="100" 
              height="20" 
              fill="#ffffff" 
              rx="4" 
              stroke="#bfdbfe" 
              strokeWidth="1" 
            />
            <foreignObject 
              x={(getX(0, currentZoom) + getX(L, currentZoom)) / 2 - 50} 
              y={timelineY - 56} 
              width="100" 
              height="20" 
              className="pointer-events-none text-center"
            >
              <div className="text-[9px] font-bold text-blue-700 select-none flex items-center justify-center h-full">
                <InlineMath math={`T_{\\mathrm{frame}} = \\frac{L}{f_s}`} />
              </div>
            </foreignObject>
          </g>

          {/* Vertical Guidelines to map labels out of collision zones (Lanes of indicators) */}
          <line
            x1={getX(0, currentZoom)}
            y1={timelineY - 30}
            x2={getX(0, currentZoom)}
            y2={timelineY - 55}
            stroke="#2563eb"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <line
            x1={getX(L, currentZoom)}
            y1={timelineY - 30}
            x2={getX(L, currentZoom)}
            y2={timelineY - 55}
            stroke="#dc2626"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <line
            x1={getX(L - 1, currentZoom)}
            y1={timelineY + 30}
            x2={getX(L - 1, currentZoom)}
            y2={timelineY + 55}
            stroke="#4f46e5"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* TOP LANE: Start Boundary card layout representation */}
          <foreignObject
            x={Math.max(10, getX(0, currentZoom) - 130)}
            y={timelineY - 150}
            width="170"
            height="90"
            className="pointer-events-none"
          >
            <div className="bg-blue-50/95 border border-blue-200 rounded-lg p-2 flex flex-col justify-center h-full text-center leading-normal shadow-xs">
              <span className="text-[9px] font-extrabold text-blue-800 uppercase tracking-wider block">
                Start Boundary
              </span>
              <span className="text-[9px] font-mono font-medium text-slate-400 block pb-0.5">
                <InlineMath math={`t_{\\mathrm{start}} = \\frac{s_m}{f_s}`} />
              </span>
              <div className="border-t border-blue-100 my-0.5" />
              <span className="font-mono text-[11px] font-black text-blue-900 block pt-0.5">
                <InlineMath math={`\\frac{${startIdx}}{${fs}}\\,\\text{s} = ${tStart.toFixed(4)}\\,\\text{s}`} />
              </span>
            </div>
          </foreignObject>

          {/* TOP LANE: Exclusive End Boundary card layout representation */}
          <foreignObject
            x={Math.min(currentSvgWidth - 180, getX(L, currentZoom) - 40)}
            y={timelineY - 150}
            width="170"
            height="90"
            className="pointer-events-none"
          >
            <div className="bg-red-50/95 border border-red-200 rounded-lg p-2 flex flex-col justify-center h-full text-center leading-normal shadow-xs">
              <span className="text-[9px] font-extrabold text-red-800 uppercase tracking-wider block">
                End Boundary (Exclusive)
              </span>
              <span className="text-[9px] font-mono font-medium text-slate-400 block pb-0.5">
                <InlineMath math={`t_{\\mathrm{end}} = \\frac{s_m + L}{f_s}`} />
              </span>
              <div className="border-t border-red-100 my-0.5" />
              <span className="font-mono text-[11px] font-black text-red-900 block pt-0.5">
                <InlineMath math={`\\frac{${boundaryIdx}}{${fs}}\\,\\text{s} = ${tBoundary.toFixed(4)}\\,\\text{s}`} />
              </span>
            </div>
          </foreignObject>

          {/* BOTTOM LANE: Last Included Sample card layout representation */}
          <foreignObject
            x={Math.max(10, Math.min(currentSvgWidth - 190, getX(L - 1, currentZoom) - 90))}
            y={timelineY + 55}
            width="180"
            height="90"
            className="pointer-events-none"
          >
            <div className="bg-indigo-50/95 border border-indigo-200 rounded-lg p-2 flex flex-col justify-center h-full text-center leading-normal shadow-xs">
              <span className="text-[9px] font-extrabold text-indigo-800 uppercase tracking-wider block">
                Last Included Sample
              </span>
              <span className="text-[9px] font-mono font-medium text-slate-400 block pb-0.5">
                <InlineMath math={`t_{\\mathrm{last}} = \\frac{s_m + L - 1}{f_s}`} />
              </span>
              <div className="border-t border-indigo-100 my-0.5" />
              <span className="font-mono text-[11px] font-black text-indigo-900 block pt-0.5">
                <InlineMath math={`\\frac{${lastSampleIdx}}{${fs}}\\,\\text{s} = ${tLastSample.toFixed(4)}\\,\\text{s}`} />
              </span>
            </div>
          </foreignObject>

          {/* Discrete points (including selected and decimated timing indicators under the axis) */}
          {Array.from({ length: L }).map((_, l) => {
            const gVal = startIdx + l;
            const xPos = getX(l, currentZoom);
            const isEllSelected = l === selectedEll;
            const tVal = gVal / fs;
            const step = getTickStep();

            return (
              <g key={`timeline-draw-sample-${l}`} className="transition-all duration-150">
                {/* Tick offset mark */}
                <line
                  x1={xPos}
                  y1={timelineY - 6}
                  x2={xPos}
                  y2={timelineY + 6}
                  stroke={isEllSelected ? '#2563eb' : '#cbd5e1'}
                  strokeWidth={isEllSelected ? '2' : '1'}
                />

                {/* Pulsing indicator loop for selected sampling instant */}
                {isEllSelected && (
                  <circle
                    cx={xPos}
                    cy={timelineY}
                    r="8.5"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                )}

                {/* Bold timing dot */}
                <circle
                  cx={xPos}
                  cy={timelineY}
                  r={isEllSelected ? '5.5' : '3.5'}
                  fill={isEllSelected ? 'url(#selectedSampleGrad)' : '#475569'}
                />

                {/* Sub-tick timing numeric label under continuous line */}
                {l > 0 && l < L - 1 && l % step === 0 && (
                  <text
                    x={xPos}
                    y={timelineY + 20}
                    fill="#64748b"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {gVal}/{fs}s
                  </text>
                )}
              </g>
            );
          })}

          {/* Hollow circle displaying physically exclusive end position */}
          <g>
            {/* Tick offset mark */}
            <line
              x1={getX(L, currentZoom)}
              y1={timelineY - 6}
              x2={getX(L, currentZoom)}
              y2={timelineY + 6}
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Orange/Red outer exclusive indicator */}
            <circle
              cx={getX(L, currentZoom)}
              cy={timelineY}
              r="6.5"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="3.5"
            />
          </g>

          {/* Transparent interactive hotspot coordinates overlay for safe hover calculations */}
          {/* Start Boundary Hotspot */}
          <circle
            cx={getX(0, currentZoom)}
            cy={timelineY}
            r="18"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={(e) => handleHover({ type: 'start', t: tStart, x: getX(0, currentZoom), y: timelineY }, e, isModal)}
            onMouseMove={(e) => handleHover({ type: 'start', t: tStart, x: getX(0, currentZoom), y: timelineY }, e, isModal)}
            onMouseLeave={handleHoverLeave}
          />

          {/* Individual Samples Hotspots */}
          {Array.from({ length: L }).map((_, l) => {
            const xPos = getX(l, currentZoom);
            const gVal = startIdx + l;
            const tVal = gVal / fs;
            return (
              <circle
                key={`hotspot-idx-${l}`}
                cx={xPos}
                cy={timelineY}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => handleHover({ type: 'sample', g: gVal, l: l, t: tVal, x: xPos, y: timelineY }, e, isModal)}
                onMouseMove={(e) => handleHover({ type: 'sample', g: gVal, l: l, t: tVal, x: xPos, y: timelineY }, e, isModal)}
                onMouseLeave={handleHoverLeave}
              />
            );
          })}

          {/* End Boundary Hotspot */}
          <circle
            cx={getX(L, currentZoom)}
            cy={timelineY}
            r="18"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={(e) => handleHover({ type: 'end', t: tBoundary, x: getX(L, currentZoom), y: timelineY }, e, isModal)}
            onMouseMove={(e) => handleHover({ type: 'end', t: tBoundary, x: getX(L, currentZoom), y: timelineY }, e, isModal)}
            onMouseLeave={handleHoverLeave}
          />

        </svg>

        {/* Hover interactive coordinate mapping bubble (Relative within container limits) */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${hoveredPoint.x + 15}px`,
              top: `${hoveredPoint.y - 120}px`,
            }}
            className="z-50 min-w-[210px] bg-slate-900 border border-slate-700 text-white rounded-xl p-3 shadow-xl pointer-events-none select-none text-xs space-y-1.5 leading-none backdrop-blur-3xs"
          >
            <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between text-[10px] uppercase font-bold text-blue-450 font-sans">
              <span>Time Mapping Info</span>
              <span className="text-[9px] font-mono text-slate-400">
                {hoveredPoint.type === 'sample' 
                  ? `Offset ℓ = ${hoveredPoint.l}` 
                  : hoveredPoint.type === 'start' 
                    ? 'Start Offset' 
                    : 'Exclusive Boundary'}
              </span>
            </div>
            
            <div className="space-y-1.5">
              {hoveredPoint.type === 'sample' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Global index:</span>
                    <span className="font-mono font-bold text-white">g = {hoveredPoint.g}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Sample Instant:</span>
                    <span className="font-semibold text-blue-300">
                      <InlineMath math={`t_g = \\frac{g}{f_s}`} />
                    </span>
                  </div>
                </>
              )}

              {hoveredPoint.type === 'start' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Formula:</span>
                  <span className="font-semibold text-blue-300">
                    <InlineMath math={`t_{\\mathrm{start}} = \\frac{s_m}{f_s}`} />
                  </span>
                </div>
              )}

              {hoveredPoint.type === 'end' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Formula:</span>
                  <span className="font-semibold text-red-300">
                    <InlineMath math={`t_{\\mathrm{end}} = \\frac{s_m + L}{f_s}`} />
                  </span>
                </div>
              )}

              <div className="border-t border-slate-850 pt-1.5 flex justify-between items-center">
                <span className="text-slate-400">Physical time:</span>
                <span className="font-black text-amber-300 font-mono text-sm">
                  {hoveredPoint.t.toFixed(4)} s
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
      
      {/* Header section with expanded modal dialog launcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Physical Continuous Time Mapping</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
              Step 4
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing boundaries mapping integer sample intervals to strict continuous physical waveforms via Sampling Rate <InlineMath math="f_s" />.
          </p>
        </div>

        {/* Professional expand launcher */}
        <button
          onClick={() => setIsExpanded(true)}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-700 hover:text-blue-800 text-xs font-bold rounded-lg transition-colors cursor-pointer font-sans shadow-3xs"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Expand time mapping</span>
        </button>
      </div>

      {/* Modern Compact Reference Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider font-sans">
              Sampling Interval
            </span>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-2 text-slate-800">
            <div className="text-[13px] font-black font-mono leading-none">
              <InlineMath math={`T_s = \\frac{1}{f_s}`} />
            </div>
            <div className="mt-1 font-semibold text-slate-600 font-sans text-[11px]">
              <InlineMath math={`= \\frac{1}{${fs}} = ${tSamplePeriod.toFixed(4)}\\text{ s}`} />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider font-sans">
              Frame Start Time
            </span>
            <Compass className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-2 text-blue-900">
            <div className="text-[13px] font-black font-mono leading-none">
              <InlineMath math={`t_{\\mathrm{start}} = \\frac{s_m}{f_s}`} />
            </div>
            <div className="mt-1 font-semibold text-slate-600 font-sans text-[11px]">
              <InlineMath math={`= \\frac{${startIdx}}{${fs}} = ${tStart.toFixed(4)}\\text{ s}`} />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider font-sans">
              Frame Duration
            </span>
            <Activity className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="mt-2 text-purple-900">
            <div className="text-[13px] font-black font-mono leading-none">
              <InlineMath math={`T_{\\mathrm{frame}} = \\frac{L}{f_s}`} />
            </div>
            <div className="mt-1 font-semibold text-slate-600 font-sans text-[11px]">
              <InlineMath math={`= \\frac{${L}}{${fs}} = ${tFrame.toFixed(4)}\\text{ s}`} />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider font-sans">
              Hop Duration
            </span>
            <GitCommit className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2 text-amber-900">
            <div className="text-[13px] font-black font-mono leading-none">
              <InlineMath math={`T_{\\mathrm{hop}} = \\frac{H}{f_s}`} />
            </div>
            <div className="mt-1 font-semibold text-slate-600 font-sans text-[11px]">
              <InlineMath math={`= \\frac{${H}}{${fs}} = ${tHop.toFixed(4)}\\text{ s}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Main Timeline Graph */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400 select-none">
          <span className="font-extrabold uppercase tracking-widest text-[9px] font-sans">
            Interactive Continuous Physical Map (Height: 380px)
          </span>
          <span className="text-[10px] bg-slate-100 border border-slate-150 px-2 py-0.5 rounded font-sans text-slate-600 font-semibold flex items-center gap-1">
            <Info className="h-3 w-3" /> Hover over elements for detailed sample instants
          </span>
        </div>
        {renderTimelineSVG(false)}
      </div>

      {/* Critical Core Concept Split Board */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4 font-sans text-slate-100">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 font-sans">
            Half-open continuous interval principle
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
          <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-lg border border-slate-850">
            <span className="font-bold text-slate-200 block border-b border-slate-850 pb-1.5 font-sans">
              Discrete Included Indices:
            </span>
            <div className="font-semibold text-blue-400">
              <InlineMathCard math={`I_m = \\{s_m, \\ldots, s_m + L - 1\\}`} />
            </div>
            <div className="font-mono text-slate-300 text-[11px] bg-slate-900/60 p-2 rounded">
              <span className="text-slate-500">Substituted Indices: </span>
              <InlineMath math={`I_{${selectedFrameM}} = \\{${Array.from({ length: L }).map((_, l) => startIdx + l).join(', ')}\\}`} />
            </div>
            <p className="text-slate-400 text-[11px] font-sans">
              There are exactly <InlineMath math={`L = ${L}`} /> discrete points residing inside this buffer sequence. The indices represent distinct integer array addresses.
            </p>
          </div>

          <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-lg border border-slate-850">
            <span className="font-bold text-slate-200 block border-b border-slate-850 pb-1.5 font-sans">
              Continuous Time Interval:
            </span>
            <div className="font-semibold text-red-400">
              <InlineMathCard math={`T_{\\mathrm{interval}} = \\left[ \\frac{s_m}{f_s}, \\frac{s_m + L}{f_s} \\right)`} />
            </div>
            <div className="font-mono text-slate-300 text-[11px] bg-slate-900/60 p-2 rounded">
              <span className="text-slate-500">Physical Range: </span>
              <InlineMath math={`T_{\\mathrm{interval}} = \\left[ ${tStart.toFixed(3)}\\,\\text{s}, ${tBoundary.toFixed(3)}\\,\\text{s} \\right)`} />
            </div>
            <p className="text-slate-400 text-[11px] font-sans">
              The continuous time window spans exactly <InlineMath math={`T_{\\mathrm{frame}} = ${tFrame.toFixed(3)}\\,\\text{s}`} />. 
              The interval is half-open on the right, meaning the upper boundary belongs to the start of the next frame.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-850 pt-3 text-[11px] text-slate-400 flex items-start gap-2 italic leading-normal font-sans">
          <span className="font-extrabold text-blue-400 not-italic uppercase tracking-widest bg-blue-950/70 border border-blue-900 px-1.5 py-0.5 rounded text-[9px]">Note</span>
          <span>
            The last included sampled datum occurs exactly at <InlineMath math={`(s_m+L-1)/f_s = ${tLastSample.toFixed(4)}\\,\\text{s}`} />, whereas the mathematical continuous frame boundary is strictly at <InlineMath math={`(s_m+L)/f_s = ${tBoundary.toFixed(4)}\\,\\text{s}`} />. These are separate concepts.
          </span>
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
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Interactive Physical Mapping Studio
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Analyze continuous axis conversions &bull; Press <span className="font-extrabold text-slate-600 bg-slate-200 rounded px-1 text-[10px]">Esc</span> to dismiss
                  </p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleZoom('out')}
                  disabled={isFitInterval}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out Timeline"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setIsFitInterval(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isFitInterval
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-220 text-slate-600 hover:text-slate-800'
                  }`}
                  title="Fit Timeline View to Screen"
                >
                  Fit Interval
                </button>

                <button
                  onClick={() => handleZoom('in')}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Zoom In Timeline"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    setZoomScale(1.0);
                    setIsFitInterval(false);
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
                  title="Close Studio"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Modal Body workspace (Graph height: at least 680px for full presentation) */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/45 flex-1 max-h-[75vh]">
              
              {/* Reference Grid info card */}
              <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wider font-sans">
                    Active System Physical Parameters Summary
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-mono font-bold text-slate-600">
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Frame index: <span className="text-blue-700">m = {selectedFrameM}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Hop offset: <span className="text-indigo-700">s_m = {startIdx}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Frame width: <span className="text-purple-700">L = {L}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-205">
                    Sampling Rate: <span className="text-amber-700">f_s = {fs} Hz</span>
                  </div>
                </div>
              </div>

              {/* Large Timeline visual container */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-extrabold uppercase tracking-wider text-[9.5px] font-sans">
                    Expanded Lab Visual Axis (Zoom Scale: {(zoomScale * 100).toFixed(0)}%)
                  </span>
                  {L > 16 && (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100 font-sans text-[10px]">
                      Swipe horizontally to scan the high-resolution timeline
                    </span>
                  )}
                </div>

                {/* Draw Large SVT inside modal container */}
                {renderTimelineSVG(true)}
              </div>

              {/* Double-column explanation summary grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Math Info Block 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 font-sans">
                    Physical Boundary Formula mapping
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-sans leading-relaxed">
                    <p>
                      In any frame index <InlineMath math="m" />, the segment maps integer discrete index addresses <InlineMath math="\\ell \\in [0, L-1]" /> to physical Continuous timing units in seconds using the rule:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-center">
                      <InlineMath math={`t_{\\ell} = \\frac{s_m + \\ell}{f_s} = \\frac{m \\cdot H + \\ell}{f_s}`} />
                    </div>
                    <p>
                      This conversion establishes that discrete timing instants are simple coordinate nodes aligned to uniform spatial grids.
                    </p>
                  </div>
                </div>

                {/* Visual Math Info Block 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-3.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 font-sans">
                    Continuous Interval Boundaries Principle
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-sans leading-relaxed">
                    <p>
                      The frame is a physically continuous window enclosing everything from its starting coordinate up to (but not including) the starting point of the next frames:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-center">
                      <InlineMath math={`t \\in \\left[ \\frac{s_m}{f_s}, \\frac{s_m + L}{f_s} \\right)`} />
                    </div>
                    <p>
                      The duration is exactly <InlineMath math="T_{\mathrm{frame}} = L/f_s" />. Notice that the actual last discrete sample in the list lands at <InlineMath math="(s_m+L-1)/f_s" />, leaving the interval half-open.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer status info */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center text-[10.5px] text-slate-400 font-medium">
              <span>Conversion system alignment base frequency: <InlineMath math={`f_s = ${fs}\\,\\text{Hz}`} /></span>
              <span>Workspace ID: FS-{fs}-M-{selectedFrameM}-L-{L}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple standalone component to render centered display equations nicely inside panels safely
const InlineMathCard: React.FC<{ math: string }> = ({ math }) => (
  <div className="flex items-center justify-center py-2 bg-slate-950/40 rounded-md border border-slate-850/40 my-1">
    <InlineMath math={math} className="text-sm font-bold block" />
  </div>
);

export default PhysicalTimeMap;
