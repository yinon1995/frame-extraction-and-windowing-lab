/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertOctagon, AlertTriangle, Info, X, ShieldAlert } from 'lucide-react';
import { InlineMath } from './Math';
import { MathValidationIssue } from '../math/validation';

interface MathValidationCenterProps {
  issues: MathValidationIssue[];
  activeTab?: number;
}

export const MathValidationCenter: React.FC<MathValidationCenterProps> = ({ issues }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Deduplicate issues by unique id
  const uniqueIssues: MathValidationIssue[] = [];
  const seenIds = new Set<string>();
  for (const issue of issues) {
    if (!seenIds.has(issue.id)) {
      seenIds.add(issue.id);
      uniqueIssues.push(issue);
    }
  }

  // Group issues by severity
  const errors = uniqueIssues.filter(i => i.severity === "error");
  const warnings = uniqueIssues.filter(i => i.severity === "warning");
  const infos = uniqueIssues.filter(i => i.severity === "info");

  if (uniqueIssues.length === 0) {
    return (
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
        <div className="p-1 px-1.5 rounded-lg bg-emerald-100/70 border border-emerald-200">
          <span className="text-emerald-700 text-xs font-bold font-sans">✓ STATUS OK</span>
        </div>
        <p className="text-xs font-sans text-emerald-700/80 font-medium">
          Mathematical configuration is verified. No extraction gaps or Nyquist violations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs mt-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-100/60 border-b border-slate-150">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-sans">
            Mathematical Guardrails
          </h3>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs font-sans font-bold text-slate-500 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer outline-none"
        >
          {isCollapsed ? "Expand ▲" : "Collapse ▼"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {/* Errors First */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-red-650 uppercase tracking-wider font-sans flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 bg-red-550 rounded-full"></span>
                Blocking Errors ({errors.length})
              </h4>
              <div className="space-y-2">
                {errors.map((issue) => (
                  <ValidationCard key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          )}

          {/* Warnings Second */}
          {warnings.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-[10px] font-bold text-amber-650 uppercase tracking-wider font-sans flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Warnings ({warnings.length})
              </h4>
              <div className="space-y-2">
                {warnings.map((issue) => (
                  <ValidationCard key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          )}

          {/* Educational Notes Last */}
          {infos.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-[10px] font-bold text-blue-650 uppercase tracking-wider font-sans flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                Educational Insights ({infos.length})
              </h4>
              <div className="space-y-2">
                {infos.map((issue) => (
                  <ValidationCard key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ValidationCardProps {
  issue: MathValidationIssue;
}

export const ValidationCard: React.FC<ValidationCardProps> = ({ issue }) => {
  const isError = issue.severity === "error";
  const isWarning = issue.severity === "warning";

  const cardStyle = isError
    ? "bg-red-50/60 border-red-200 text-red-900 shadow-2xs"
    : isWarning
      ? "bg-amber-50/50 border-amber-200 text-amber-900"
      : "bg-blue-50/40 border-blue-150 text-blue-900";

  const iconColor = isError
    ? "text-red-600"
    : isWarning
      ? "text-amber-600"
      : "text-blue-600";

  return (
    <div className={`p-3.5 border rounded-xl flex items-start gap-3 transition-all duration-150 ${cardStyle}`}>
      <div className={`mt-0.5 p-1 rounded-lg bg-white shadow-3xs ${iconColor}`}>
        {isError && <AlertOctagon className="w-4 h-4" />}
        {isWarning && <AlertTriangle className="w-4 h-4" />}
        {!isError && !isWarning && <Info className="w-4 h-4" />}
      </div>
      <div className="space-y-1.5 flex-1 select-none">
        <div className="font-bold text-xs tracking-tight font-sans text-slate-900">
          {issue.title}
        </div>
        <p className="text-xs font-sans leading-normal opacity-90 text-slate-700">
          {issue.message}
        </p>
        
        {issue.formula && (
          <div className="py-1 px-2.5 bg-white/70 border border-slate-200/50 rounded-lg inline-block font-serif text-slate-800 my-1 font-medium shadow-3xs">
            <InlineMath math={issue.formula} />
          </div>
        )}

        {issue.suggestedFix && (
          <div className="text-[11px] font-sans text-slate-650 flex items-start gap-1">
            <span className="font-bold text-slate-800 uppercase tracking-wide text-[9px] bg-slate-100 border border-slate-200/60 rounded px-1 py-0.5 mt-0.5">
              Suggested Fix
            </span>
            <span className="italic leading-normal">{issue.suggestedFix}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Inline helper for placement next to controls
interface InlineFieldErrorProps {
  issues: MathValidationIssue[];
  fieldName: string;
}

export const InlineFieldError: React.FC<InlineFieldErrorProps> = ({ issues, fieldName }) => {
  const matched = issues.find(i => i.affectedFields.includes(fieldName));
  if (!matched) return null;

  const isError = matched.severity === "error";
  const isWarning = matched.severity === "warning";

  const textClass = isError
    ? "text-red-600"
    : isWarning
      ? "text-amber-700"
      : "text-blue-700";

  const iconClass = isError
    ? "text-red-500"
    : isWarning
      ? "text-amber-500"
      : "text-blue-500";

  return (
    <div className="flex items-start gap-1.5 mt-2 p-2 bg-white/65 rounded-lg border border-slate-150 shadow-3xs animate-in slide-in-from-top-1 duration-150">
      <div className={`mt-0.5 flex-shrink-0 ${iconClass}`}>
        {isError && <AlertOctagon className="w-3.5 h-3.5" />}
        {isWarning && <AlertTriangle className="w-3.5 h-3.5" />}
        {!isError && !isWarning && <Info className="w-3.5 h-3.5" />}
      </div>
      <div className="space-y-0.5 select-none">
        <span className={`text-[10px] uppercase font-extrabold tracking-wider block font-sans ${textClass}`}>
          {matched.severity}: {matched.title}
        </span>
        <span className="text-[11px] font-sans text-slate-650 leading-snug block">
          {matched.message}
        </span>
        {matched.formula && (
          <div className="text-[10.5px] font-serif inline-block bg-white border border-slate-100/80 px-1 py-0.5 rounded shadow-3xs my-0.5 text-slate-800">
            <InlineMath math={matched.formula} />
          </div>
        )}
      </div>
    </div>
  );
};

// Floating Active Toasts component
export interface ToastItem {
  id: string;
  issueId: string;
  title: string;
  message: string;
  severity: "error" | "warning";
  formula?: string;
  timestamp: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full select-none">
      {toasts.map((toast) => {
        const isError = toast.severity === "error";
        const borderClass = isError ? "border-red-200 bg-red-50/95" : "border-amber-200 bg-amber-50/95";
        const textClass = isError ? "text-red-950 font-bold" : "text-amber-950 font-bold";
        const iconColor = isError ? "text-red-650" : "text-amber-650";

        return (
          <div
            key={toast.id}
            className={`p-4 border shadow-xl rounded-xl flex items-start gap-3 backdrop-blur-xs animate-in slide-in-from-right-5 duration-150 ${borderClass}`}
          >
            <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
              {isError ? <AlertOctagon className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
            </div>
            
            <div className="flex-1 space-y-1">
              <div className={`text-xs font-sans font-semibold tracking-tight ${textClass}`}>
                {toast.title}
              </div>
              <p className="text-[11.5px] font-sans text-slate-700 leading-normal">
                {toast.message}
              </p>
              {toast.formula && (
                <div className="inline-block bg-white border px-1.5 py-0.5 rounded shadow-3xs text-[11px]">
                  <InlineMath math={toast.formula} />
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-450 hover:text-slate-750 transition-colors border-none bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
