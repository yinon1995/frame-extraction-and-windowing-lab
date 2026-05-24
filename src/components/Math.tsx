/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathProps {
  math: string;
  className?: string;
}

export const InlineMath: React.FC<MathProps> = ({ math, className }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math]);

  return (
    <span
      ref={containerRef}
      className={`math-inline-nowrap inline-block max-w-full align-middle ${className || ''}`}
    />
  );
};

export const MathBlock: React.FC<MathProps> = ({ math, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math]);

  return <div ref={containerRef} className={`my-1.5 overflow-x-auto ${className || ''}`} />;
};

export const BlockMath: React.FC<MathProps> = ({ math, className }) => {
  return <MathBlock math={math} className={className} />;
};

interface MathLabelProps {
  math: string;
  prefix?: string;
  className?: string;
  mathClassName?: string;
}

export const MathLabel: React.FC<MathLabelProps> = ({ math, prefix, className, mathClassName }) => {
  return (
    <span className={`inline-flex items-center gap-1 font-sans ${className || ''}`}>
      {prefix && <span className="text-slate-500 font-medium">{prefix}</span>}
      <InlineMath math={math} className={`text-slate-800 font-medium ${mathClassName || ''}`} />
    </span>
  );
};

interface MathCalloutProps {
  title: string;
  xFormula: string;
  gFormula: string;
  tFormula: string;
  className?: string;
}

export const MathCallout: React.FC<MathCalloutProps> = ({ title, xFormula, gFormula, tFormula, className }) => {
  return (
    <div 
      className={`border-2 border-blue-500 rounded-lg p-2.5 shadow-md flex flex-col justify-start select-none ${className || ''}`}
      style={{
        backgroundColor: '#ffffff',
        opacity: 1,
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        mixBlendMode: 'normal',
      }}
    >
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-1 mb-1.5 leading-tight">
        {title}
      </span>
      <div className="flex flex-col gap-1 text-slate-800">
        <InlineMath math={xFormula} className="text-xs font-bold text-blue-700 block" />
        <InlineMath math={gFormula} className="text-[11px] text-slate-600 block" />
        <InlineMath math={tFormula} className="text-[11px] text-slate-600 block" />
      </div>
    </div>
  );
};

interface FormulaCardProps {
  title?: string;
  formulas: { label: string; formula: string }[];
  className?: string;
}

export const FormulaCard: React.FC<FormulaCardProps> = ({ title, formulas, className }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm ${className || ''}`}>
      {title && (
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          {title}
        </h4>
      )}
      <div className="space-y-3">
        {formulas.map((item, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-1 px-1.5 hover:bg-slate-50 rounded transition-all duration-150 border border-transparent hover:border-slate-100"
          >
            <span className="text-xs text-slate-500 font-medium">{item.label}</span>
            <div className="font-serif">
              <InlineMath math={item.formula} className="text-sm font-medium text-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MathLineProps {
  math: string;
  label?: string;
  className?: string;
}

export const MathLine: React.FC<MathLineProps> = ({ math, label, className }) => {
  return (
    <div className={`flex items-center justify-between gap-2 text-xs py-0.5 ${className || ''}`}>
      {label && <span className="text-slate-500 font-medium">{label}</span>}
      <InlineMath math={math} className="font-mono text-slate-850" />
    </div>
  );
};

interface MathCalloutLineProps {
  math: string;
  className?: string;
}

export const MathCalloutLine: React.FC<MathCalloutLineProps> = ({ math, className }) => {
  return (
    <div className={`p-1 px-1.5 rounded bg-blue-50/70 border-l-2 border-blue-500 my-0.5 ${className || ''}`}>
      <InlineMath math={math} className="text-blue-800 font-bold font-mono" />
    </div>
  );
};

interface MathBadgeProps {
  math: string;
  className?: string;
}

export const MathBadge: React.FC<MathBadgeProps> = ({ math, className }) => {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded bg-slate-105 border border-slate-200/60 text-[11px] font-medium text-slate-800 gap-1 ${className || ''}`}>
      <InlineMath math={math} />
    </span>
  );
};

