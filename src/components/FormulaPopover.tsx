/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface FormulaPopoverProps {
  id: string; // e.g. 's_m'
  symbolKey: 'H' | 'L' | 'm' | 'ell' | 'fs' | null | string;
  math: React.ReactNode;
  explanation: string;
  hoveredSymbol: string | null;
  setHoveredSymbol: (s: string | null) => void;
}

export const FormulaPopover: React.FC<FormulaPopoverProps> = ({
  id,
  symbolKey,
  math,
  explanation,
  hoveredSymbol,
  setHoveredSymbol,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Determine if this formula matches the currently hovered system term
  const isHighlighted = hoveredSymbol === symbolKey && symbolKey !== null;

  return (
    <div
      id={`formula-container-${id}`}
      className={`relative inline-flex items-center gap-1.5 px-2 py-1 rounded transition-all select-none duration-200 ${
        isHighlighted
          ? 'bg-blue-50 border border-blue-400 font-medium text-blue-900 shadow-xs'
          : 'bg-gray-50/50 border border-gray-200 hover:border-gray-300'
      }`}
      onMouseEnter={() => symbolKey && setHoveredSymbol(symbolKey)}
      onMouseLeave={() => setHoveredSymbol(null)}
    >
      <span className="font-mono text-sm tracking-tight text-gray-800">{math}</span>
      <button
        id={`formula-info-btn-${id}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer`}
        title="View details and formula significance"
      >
        <Info size={13} />
      </button>

      {isOpen && (
        <div
          id={`formula-popout-${id}`}
          className="absolute z-40 left-0 top-full mt-2 w-72 p-3 bg-white border-2 border-slate-900 rounded-lg shadow-xl text-xs text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-1.5 border-b border-gray-100 pb-1.5">
            <span className="font-bold text-slate-900 tracking-wide uppercase text-[10px] text-blue-700">Formula Breakdown</span>
            <button
              id={`formula-close-btn-${id}`}
              onClick={() => setIsOpen(false)}
              className="p-0.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
            >
              <X size={12} />
            </button>
          </div>
          <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-800 font-semibold mb-2 text-center text-[13px]">
            {math}
          </div>
          <p className="leading-relaxed text-gray-600 font-sans">{explanation}</p>
          <div className="mt-2 text-[10px] text-gray-400 italic">
            Click information icon again or close to dismiss.
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaPopover;
