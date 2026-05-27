/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { LabState } from '../math/framing';
import { InlineMath } from './Math';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, X, TableProperties } from 'lucide-react';

interface LocalCoordinateMapProps {
  labState: LabState;
  onSelectLocalIndex: (ell: number) => void;
}

export const LocalCoordinateMap: React.FC<LocalCoordinateMapProps> = ({
  labState,
  onSelectLocalIndex,
}) => {
  const {
    H,
    L,
    selectedFrameM,
    selectedEll,
    selectedFrame,
    selectedLocalFrameValues,
  } = labState;

  const startM = selectedFrame.start;

  // Modern component local states for hover tooltip and full-height modal interaction
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number } | null>(null);
  
  // Zoom & fitting behaviors for the full-screen interactive mode
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFitColumns, setIsFitColumns] = useState(false);

  // Refs for tracking container and table bounds to calculate and constrain tooltip coordinates safely
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const modalTableContainerRef = useRef<HTMLDivElement>(null);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Auto-scroll the selected column into view whenever selection or mode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const scrollSelectedIntoView = (container: HTMLDivElement | null) => {
        if (!container) return;
        const selectedCell = container.querySelector('[data-selected="true"]');
        if (selectedCell) {
          selectedCell.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      };

      scrollSelectedIntoView(tableContainerRef.current);
      if (isExpanded) {
        scrollSelectedIntoView(modalTableContainerRef.current);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [selectedEll, isExpanded]);

  const updateTooltipCoords = (e: React.MouseEvent, isModal: boolean) => {
    const container = isModal ? modalTableContainerRef.current : tableContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    // Position the tooltip slightly offset from the mouse pointer
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Define standard fallback boundaries
    let left = mouseX + 15;
    let top = mouseY + 15;
    const tooltipWidth = 240;
    const tooltipHeight = 120;

    if (left + tooltipWidth > rect.width) {
      left = mouseX - tooltipWidth - 15;
    }
    if (top + tooltipHeight > rect.height) {
      top = rect.height - tooltipHeight - 15; // constrain safely inside container vertical limit
    }

    setTooltipCoords({
      x: Math.max(8, left),
      y: Math.max(8, top),
    });
  };

  // Helper to dynamically calculate stable column styling depending on selection state and scale zoom factors
  const getColStyle = (l: number, isModal: boolean) => {
    const isSelected = l === selectedEll;
    const forceScroll = L > 12;
    const fit = isFitColumns && !forceScroll && isModal;
    
    if (fit) {
      return {
        minWidth: 'auto',
        width: 'auto',
      };
    }
    
    const zoomVal = zoomScale;
    const baseWidth = isSelected ? 155 : 94;
    const activeWidth = Math.round(baseWidth * zoomVal);
    
    return {
      minWidth: `${activeWidth}px`,
      width: `${activeWidth}px`,
    };
  };

  const renderMappingTable = (isModal: boolean) => {
    const currentContainerRef = isModal ? modalTableContainerRef : tableContainerRef;

    return (
      <div 
        ref={currentContainerRef}
        className="relative border border-slate-200 rounded-xl overflow-x-auto overflow-y-hidden bg-white shadow-xs custom-scrollbar"
        style={{ maxHeight: isModal ? '380px' : 'none' }}
      >
        {/* Style block to inject sleek customized slim scrollbars */}
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

        <table className="w-full border-collapse text-left text-xs bg-white table-fixed relative" style={{ minWidth: '100%' }}>
          {/* Header containing helper indicators */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              {/* Row labels sticky left column with full high-contrast opacity */}
              <th className="left-0 sticky left-0 top-0 bg-slate-100 border-r border-slate-200 p-4 pl-5 w-[180px] min-w-[180px] font-sans font-extrabold text-[11px] text-slate-500 shadow-[4px_0_8px_rgba(0,0,0,0.04)] z-30 select-none">
                Coordinate Map
              </th>
              {Array.from({ length: L }).map((_, l) => {
                const isSelected = l === selectedEll;
                const isHovered = l === hoveredIndex;
                const colStyles = getColStyle(l, isModal);
                return (
                  <th
                    key={`header-idx-${l}`}
                    data-selected={isSelected ? "true" : "false"}
                    style={colStyles}
                    className={`p-3.5 text-center transition-all select-none ${
                      isSelected 
                        ? 'bg-blue-50 border-x-2 border-blue-500' 
                        : isHovered 
                          ? 'bg-slate-100/70 border-x border-slate-100' 
                          : 'bg-slate-50 border-x border-transparent'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center min-h-[46px]">
                      {isSelected ? (
                        <>
                          <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest leading-none font-sans mb-1.5 block">
                            Selected
                          </span>
                          <span className="text-[13px] text-blue-900 font-black block leading-none">
                            <InlineMath math={String.raw`\ell = ${l}`} />
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] text-slate-500 font-bold block leading-none">
                          <InlineMath math={String.raw`\ell = ${l}`} />
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Local Offset Index (ell) */}
            <tr className="border-b border-slate-200 group">
              <td className="left-0 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-4 pl-5 shadow-[4px_0_8px_rgba(0,0,0,0.04)] leading-relaxed select-none">
                <div className="flex flex-col">
                  <span className="text-slate-800 text-[13px] font-bold">Local offset</span>
                  <div className="mt-0.5 text-blue-700 text-xs flex items-center gap-1 font-semibold font-mono">
                    <InlineMath math={String.raw`\ell`} />
                    <span className="text-[10px] font-normal text-slate-400 font-sans">coordinate</span>
                  </div>
                </div>
              </td>
              {Array.from({ length: L }).map((_, l) => {
                const isSelected = l === selectedEll;
                const isHovered = l === hoveredIndex;
                const colStyles = getColStyle(l, isModal);
                return (
                  <td
                    key={`l-cell-${l}`}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => onSelectLocalIndex(l)}
                    onMouseEnter={(e) => {
                      setHoveredIndex(l);
                      updateTooltipCoords(e, isModal);
                    }}
                    onMouseMove={(e) => {
                      updateTooltipCoords(e, isModal);
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltipCoords(null);
                    }}
                    style={colStyles}
                    className={`p-4 text-center cursor-pointer transition-all border-r border-slate-150 last:border-r-0 select-none ${
                      isSelected
                        ? 'bg-blue-50 border-x-2 border-blue-500 text-blue-800 font-extrabold text-sm relative'
                        : isHovered
                          ? 'bg-slate-50 text-slate-900'
                          : 'text-slate-600 font-medium'
                    }`}
                  >
                    <span className="font-mono text-sm font-semibold">
                      <InlineMath math={String.raw`\ell = ${l}`} />
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* Row 2: Global Coordinate (g = mH + ell) */}
            <tr className="border-b border-slate-200 group">
              <td className="left-0 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-4 pl-5 shadow-[4px_0_8px_rgba(0,0,0,0.04)] leading-relaxed select-none">
                <div className="flex flex-col">
                  <span className="text-slate-800 text-[13px] font-bold">Global index</span>
                  <div className="mt-0.5 text-indigo-700 text-xs flex items-center gap-1 font-semibold font-mono">
                    <InlineMath math={String.raw`g = mH + \ell`} />
                  </div>
                </div>
              </td>
              {Array.from({ length: L }).map((_, l) => {
                const absG = startM + l;
                const isSelected = l === selectedEll;
                const isHovered = l === hoveredIndex;
                const colStyles = getColStyle(l, isModal);
                return (
                  <td
                    key={`g-cell-${l}`}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => onSelectLocalIndex(l)}
                    onMouseEnter={(e) => {
                      setHoveredIndex(l);
                      updateTooltipCoords(e, isModal);
                    }}
                    onMouseMove={(e) => {
                      updateTooltipCoords(e, isModal);
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltipCoords(null);
                    }}
                    style={colStyles}
                    className={`p-4 text-center cursor-pointer transition-all border-r border-slate-150 last:border-r-0 select-none ${
                      isSelected
                        ? 'bg-blue-50 border-x-2 border-blue-500 text-indigo-900 font-extrabold'
                        : isHovered
                          ? 'bg-slate-50 text-indigo-955 font-bold'
                          : 'text-slate-600 font-medium'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center min-h-[46px]">
                      {isSelected ? (
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-[9px] text-slate-400 font-normal leading-none font-sans">
                            <InlineMath math={String.raw`g = mH + \ell`} />
                          </span>
                          <span className="font-bold text-indigo-705 leading-none text-xs">
                            <InlineMath math={String.raw`g = ${selectedFrameM} \cdot ${H} + ${l} = ${absG}`} />
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700 font-mono text-xs">
                          <InlineMath math={`g = ${absG}`} />
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Row 3: Frame Value x^(m)[ell] = x[g] */}
            <tr className="group">
              <td className="left-0 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-4 pl-5 shadow-[4px_0_8px_rgba(0,0,0,0.04)] leading-relaxed select-none">
                <div className="flex flex-col">
                  <span className="text-slate-800 text-[13px] font-bold">Signal value</span>
                  <div className="mt-0.5 text-amber-700 text-xs font-bold">
                    <InlineMath
                      math={String.raw`x^{(m)}[\ell] = x[g]`}
                      className="step3-row-label-math"
                    />
                  </div>
                </div>
              </td>
              {selectedLocalFrameValues.map((val, l) => {
                const absG = startM + l;
                const isSelected = l === selectedEll;
                const isHovered = l === hoveredIndex;
                const colStyles = getColStyle(l, isModal);
                return (
                  <td
                    key={`v-cell-${l}`}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => onSelectLocalIndex(l)}
                    onMouseEnter={(e) => {
                      setHoveredIndex(l);
                      updateTooltipCoords(e, isModal);
                    }}
                    onMouseMove={(e) => {
                      updateTooltipCoords(e, isModal);
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltipCoords(null);
                    }}
                    style={colStyles}
                    className={`p-4 text-center cursor-pointer transition-all border-r border-slate-150 last:border-r-0 select-none ${
                      isSelected
                        ? 'bg-blue-100 border-x-2 border-blue-500 font-black'
                        : isHovered
                          ? 'bg-slate-50 text-slate-950 font-bold'
                          : 'text-slate-650 font-medium'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center min-h-[42px]">
                      {isSelected ? (
                        <span className="text-slate-900 leading-normal text-xs font-bold block">
                          <InlineMath math={`x^{(${selectedFrameM})}[${l}] = x[${absG}] = ${val.toFixed(4)}`} />
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs block font-semibold">
                          {val.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {/* Hover coordinate mapping overlay tooltip (ONE ONLY) */}
        {hoveredIndex !== null && tooltipCoords && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipCoords.x}px`,
              top: `${tooltipCoords.y}px`,
            }}
            className="z-50 min-w-[230px] bg-slate-900 border border-slate-700 text-white rounded-lg p-3 shadow-xl max-w-xs font-sans text-xs space-y-1.5 pointer-events-none select-none backdrop-blur-3xs leading-none"
          >
            <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between text-[10px] uppercase font-bold text-blue-450">
              <span>Coordinate Mapping</span>
              <span className="text-[9px] font-mono text-slate-400">Idx {hoveredIndex}</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Local Offset:</span>
                <span className="font-semibold text-white">
                  <InlineMath math={`\\ell = ${hoveredIndex}`} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Global index:</span>
                <span className="font-semibold text-indigo-300">
                  <InlineMath math={`g = mH + \\ell = ${startM + hoveredIndex}`} />
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80">
                <span className="text-slate-400">Mapped value:</span>
                <span className="font-bold text-amber-300">
                  <InlineMath math={`x^{(${selectedFrameM})}[${hoveredIndex}] = ${selectedLocalFrameValues[hoveredIndex]?.toFixed(4)}`} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const toSuperscript = (m: number): string => {
    const mapping: { [key: string]: string } = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return '⁽' + String(m).split('').map(char => mapping[char] || char).join('') + '⁾';
  };

  const toSubscript = (m: number): string => {
    const mapping: { [key: string]: string } = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
    };
    return String(m).split('').map(char => mapping[char] || char).join('');
  };

  const CoordinateMappingRow: React.FC<{
    label: string;
    formula?: React.ReactNode;
    value: React.ReactNode;
  }> = ({ label, formula, value }) => {
    return (
      <div className="space-y-1 w-full text-left">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-sans block">
          {label}
        </span>
        {formula && (
          <div className="coordinate-card-math-box rounded-lg bg-slate-100/60 border border-slate-205 px-2.5 py-1.5 flex items-center justify-start min-h-[30px] w-full">
            {formula}
          </div>
        )}
        <div className="coordinate-card-math-box rounded-lg bg-blue-50/60 border border-blue-100 px-2.5 py-1.5 flex items-center justify-start min-h-[30px] w-full">
          {value}
        </div>
      </div>
    );
  };

  const renderCalculationCard = () => {
    const selectedVal = selectedLocalFrameValues[selectedEll] ?? 0;
    const globalIdx = startM + selectedEll;

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-[18px] space-y-4 shadow-3xs flex flex-col h-full justify-start">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <span className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">
            Current coordinate mapping
          </span>
          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-mono">
            Active
          </span>
        </div>

        <div className="space-y-3.5">
          {/* Frame Index & Hop size: full-width rows */}
          <CoordinateMappingRow
            label="Frame Index"
            value={
              <span className="math-unicode-nowrap text-xs text-blue-700 font-bold font-serif">
                m = {selectedFrameM}
              </span>
            }
          />

          <CoordinateMappingRow
            label="Hop size"
            value={
              <span className="math-unicode-nowrap text-xs text-blue-700 font-bold font-serif">
                H = {H}
              </span>
            }
          />

          {/* Start Offset */}
          <CoordinateMappingRow
            label="Start Offset"
            formula={
              <span className="math-unicode-nowrap text-xs text-slate-600 font-medium font-serif font-style:italic">
                s_m = mH
              </span>
            }
            value={
              <span className="math-unicode-nowrap text-xs font-bold text-blue-705 font-serif">
                s{toSubscript(selectedFrameM)} = {selectedFrameM} &middot; {H} = {startM}
              </span>
            }
          />

          {/* Local Index */}
          <CoordinateMappingRow
            label="Local Index"
            value={
              <span className="math-unicode-nowrap text-xs font-bold text-blue-700 font-serif font-medium">
                ℓ = {selectedEll}
              </span>
            }
          />

          {/* Global Index */}
          <CoordinateMappingRow
            label="Global index"
            formula={
              <span className="math-unicode-nowrap text-xs text-slate-600 font-medium font-serif font-style:italic">
                g = mH + ℓ
              </span>
            }
            value={
              <span className="math-unicode-nowrap text-xs font-bold text-blue-705 font-serif">
                g = {selectedFrameM} &middot; {H} + {selectedEll} = {globalIdx}
              </span>
            }
          />

          {/* Frame Value */}
          <CoordinateMappingRow
            label="Frame value"
            formula={
              <span className="math-unicode-nowrap text-xs text-slate-600 font-medium font-serif font-style:italic">
                x⁽ᵐ⁾[ℓ] = x[g]
              </span>
            }
            value={
              <span className="math-unicode-nowrap text-xs font-bold text-blue-705 font-serif">
                x{toSuperscript(selectedFrameM)}[{selectedEll}] = x[{globalIdx}] = {selectedVal.toFixed(4)}
              </span>
            }
          />
        </div>
      </div>
    );
  };


  const renderActiveFrameVector = () => {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 flex flex-col items-center justify-between h-full min-h-[240px]">
        <div className="w-full text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block font-sans">
            Active Frame Vector
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 py-1.5 w-full">
          {/* Equation and vector rendered as one aligned math row */}
          <div className="text-sm font-semibold text-slate-800 select-none pointer-events-none">
            <InlineMath math={String.raw`\mathbf{x}^{(${selectedFrameM})} =`} />
          </div>

          {/* Matrix Left Bracket */}
          <div className="w-2.5 h-32 border-y border-l border-slate-700 rounded-l"></div>

          {/* Elements list (scrollable if L > 7 to prevent unrequested visual overflow or height blowups) */}
          <div className="overflow-y-auto max-h-[128px] scrollbar-thin scrollbar-thumb-slate-300 pr-0.5 flex flex-col justify-between py-1 min-w-[75px] text-center font-mono text-xs">
            {selectedLocalFrameValues.map((val, l) => {
              const isSelected = l === selectedEll;
              return (
                <div
                  key={`col-vector-${l}`}
                  onClick={() => onSelectLocalIndex(l)}
                  className={`px-1.5 py-0.5 my-0.5 rounded cursor-pointer transition-colors font-semibold select-none text-[11px] ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-bold ring-2 ring-blue-500/10'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {val.toFixed(3)}
                </div>
              );
            })}
          </div>

          {/* Matrix Right Bracket */}
          <div className="w-2.5 h-32 border-y border-r border-slate-700 rounded-r"></div>

          <div className="text-[9.5px] text-slate-400 font-bold italic ml-1 select-none pointer-events-none">
            <InlineMath math={`${L} \\times 1`} />
          </div>
        </div>

        {/* Informative subtitle with customized selected index rendering */}
        <div className="bg-white border border-slate-150 text-[10.5px] mt-2 p-2 rounded-lg w-full text-center text-slate-655 font-sans shadow-xs pointer-events-none select-none">
          <span className="block text-[8.5px] uppercase tracking-wider text-slate-400 font-extrabold mb-0.5">Focus Sample Value</span>
          <InlineMath math={`x^{(${selectedFrameM})}[${selectedEll}] = ${selectedLocalFrameValues[selectedEll].toFixed(4)}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      
      {/* Header with standard visual layout, including expand coordinate table trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <span>Local Coordinates Mapping Studio</span>
            <span className="text-xs font-bold text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded inline-flex items-center">
              <span className="step-title-formula-badge font-bold">x⁽ᵐ⁾[ℓ]</span>
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Tracking index coordinates translation mapping local buffer frames back onto continuous global system arrays.
          </p>
        </div>

        {/* Premium Clickable Expansion Mode Trigger */}
        <button
          onClick={() => setIsExpanded(true)}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-700 hover:text-blue-800 text-xs font-bold rounded-lg transition-colors cursor-pointer font-sans"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Expand coordinate table</span>
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          Select any column index in the grid below to pivot the focus coordinate mapping <InlineMath math="\\ell" />, realigning math readouts live:
        </p>

        {/* Embed-sized grid layout - Table gets 3/4 width on large screens to prevent squeezed labels / overlap */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          <div className="xl:col-span-3 space-y-4 w-full">
            {renderMappingTable(false)}
          </div>
          
          <div className="xl:col-span-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4 items-stretch h-full">
            <div className="flex-1">
              {renderCalculationCard()}
            </div>
            <div className="flex-1">
              {renderActiveFrameVector()}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Popover/Modal overlay trigger system */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 md:p-10">
          <div 
            className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4.5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-105 text-blue-600">
                  <TableProperties className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Interactive Local Mapping Studio
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Expanded full-screen coordinate mapping matrix workspace &bull; Press <span className="font-extrabold text-slate-500 bg-slate-200 rounded px-1 text-[10px]">Esc</span> to dismiss
                  </p>
                </div>
              </div>

              {/* Modal Controls Toolbar */}
              <div className="flex items-center gap-2">
                {/* Zoom Out Button */}
                <button
                  onClick={() => setZoomScale(prev => Math.max(0.7, prev - 0.1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Zoom Out Columns"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                {/* Reset Zoom Button */}
                <button
                  onClick={() => {
                    setZoomScale(1.0);
                    setIsFitColumns(false);
                  }}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Reset Zoom & Scale"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>

                {/* Zoom In Button */}
                <button
                  onClick={() => setZoomScale(prev => Math.min(1.5, prev + 0.1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-220 text-slate-655 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Zoom In Columns"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <span className="w-px h-5 bg-slate-200 mx-1" />

                {/* Fit Columns Mode Toggle */}
                <button
                  onClick={() => setIsFitColumns(!isFitColumns)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isFitColumns
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-220 text-slate-655 hover:text-slate-800'
                  }`}
                  title="Fit Column Matrix to Container"
                >
                  Fit Columns
                </button>

                <span className="w-px h-5 bg-slate-200 mx-1" />

                {/* Close Modal Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                  title="Close Study Mode"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Modal Body Contents */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/40">
              
              {/* Frame Summary Strip */}
              <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">
                    Active Focus Target Frame Summary
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-mono font-bold text-slate-705">
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    Frame: <span className="text-blue-700">m = {selectedFrameM}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    Hop: <span className="text-indigo-700">H = {H}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    Length: <span className="text-purple-700">L = {L}</span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                    Start offset: <span className="text-amber-700">s_{selectedFrameM} = {startM}</span>
                  </div>
                </div>
              </div>

              {/* Large Mapping Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-400 uppercase tracking-widest font-sans text-[10px]">
                    Interactive Index Mapping Grid
                  </span>
                  {L > 12 && (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100 font-sans text-[10px]">
                      Swipe/Scroll horizontally to view columns
                    </span>
                  )}
                </div>
                {renderMappingTable(true)}
              </div>

              {/* Grid for Vector Card & Detailed Formulas Mapping Calculation Column Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderCalculationCard()}
                {renderActiveFrameVector()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-3 px-6 flex justify-between items-center text-[10.5px] text-slate-400 font-medium">
              <span>Coordinate translation mapping formula: <InlineMath math="g = m \\cdot H + \\ell" /></span>
              <span>Lab ID: {selectedFrameM * H + selectedEll}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LocalCoordinateMap;
