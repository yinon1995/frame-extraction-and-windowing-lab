/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InlineMath, MathBlock } from './Math';
import { LabState } from '../math/framing';
import { ChevronDown, ChevronUp, HelpCircle, BookOpen, CheckCircle2 } from 'lucide-react';

interface MathWalkthroughProps {
  labState: LabState;
}

export const MathWalkthrough: React.FC<MathWalkthroughProps> = ({ labState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCheck, setActiveCheck] = useState<string | null>(null);

  // Derive academic walkthrough values from LabState
  const {
    fs,
    N,
    L,
    H,
    M,
    selectedFrameM,
    selectedEll,
    selectedGlobalIndex,
    selectedSampleValue,
    selectedFrame,
    sampleCountMode,
    T_total,
  } = labState;

  const startIdx = selectedFrame.start;
  const endIdxExcl = selectedFrame.endExcl;
  const frameIndicesList = Array.from({ length: L }, (_, i) => startIdx + i).filter(g => g < N);
  const isOverlapping = H < L;
  const isGapped = H > L;
  const isNonOverlapping = H === L;

  let shiftType = 'non-overlapping';
  if (isOverlapping) shiftType = 'overlapping';
  if (isGapped) shiftType = 'gapped';

  const selectedSampleTime = selectedGlobalIndex / fs;
  const observedDuration = N / fs;

  // Render the dynamic list of consecutive starts
  // e.g. s_0 = 0, s_1 = H, s_2 = 2H
  const renderConsecutiveStarts = () => {
    const maxShow = 3;
    const items = [];
    for (let i = 0; i < Math.min(M, maxShow); i++) {
      items.push(`s_${i} = ${i * H}`);
    }
    if (M > maxShow) {
      items.push('\\dots');
    }
    return items.join(',\\ ');
  };

  const toggleAccordion = (id: string) => {
    if (activeCheck === id) {
      setActiveCheck(null);
    } else {
      setActiveCheck(id);
    }
  };

  return (
    <div className="space-y-4" id="math-walkthrough-root">
      {/* Primary Toggle Action Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold font-sans text-xs uppercase tracking-wider transition-all shadow-md select-none cursor-pointer border ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
          id="walkthrough-toggle-btn"
        >
          <BookOpen size={15} />
          <span>{isOpen ? 'Hide mathematical explanation' : 'Show mathematical explanation'}</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {isOpen && (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-8 animate-fade-in divide-y divide-slate-100">
          
          {/* Header Title Section */}
          <div className="pb-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-900 flex items-center gap-2 font-sans">
              <BookOpen size={16} className="text-blue-600" />
              <span>Mathematical Walkthrough of the Current View</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              A precise breakdown of the mathematical properties and relations currently displayed in the signal processing chart.
            </p>
          </div>

          {/* Section 1: What is the signal x[g] */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">1</span>
              <span>What is the signal <InlineMath math="x[g]" />?</span>
            </h4>
            <div className="text-xs text-slate-650 space-y-2 font-sans leading-relaxed">
              <p>
                <InlineMath math="x[g]" /> represents the discrete-time sampled sequence of values.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><InlineMath math="g" /> is the <strong>global sample index</strong>, representing the chronological index in the complete sequence.</li>
                <li>The physical sample index ranges boundedly as: <InlineMath math="g \in \{0, 1, \ldots, N-1\}" />.</li>
                <li>The value <InlineMath math="x[g]" /> represents the physical amplitude sample measured at that global index.</li>
              </ul>
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1 mt-2">
                <p className="font-semibold text-slate-700 mb-1">Current State Substitution:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-white rounded p-1.5 border border-slate-100 text-center">
                    Total count: <InlineMath math={`N = ${N}`} />
                  </div>
                  <div className="bg-white rounded p-1.5 border border-slate-100 text-center">
                    Selected <InlineMath math={`g_{\\text{selected}} = ${selectedGlobalIndex}`} />
                  </div>
                  <div className="bg-white rounded p-1.5 border border-slate-150 border-l-3 border-l-blue-500 text-center font-bold">
                    Value <InlineMath math={`x[${selectedGlobalIndex}] = ${selectedSampleValue.toFixed(4)}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: What does the highlighted region mean */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">2</span>
              <span>What does the highlighted region mean?</span>
            </h4>
            <div className="text-xs text-slate-650 space-y-2 font-sans leading-relaxed">
              <p>
                The blue highlighted block in the main timeline represents the current active <strong>frame interval</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The frame index <InlineMath math="m" /> does <strong>not</strong> point to an isolated single point.</li>
                <li>Instead, <InlineMath math="m" /> selects an contiguous block interval containing exactly <InlineMath math="L" /> consecutive samples.</li>
                <li>The frame starting boundary <InlineMath math="s_m" /> shifts forward proportionally with hop interval <InlineMath math="H" />:</li>
              </ul>
              <MathBlock math="s_m = m \cdot H" />
              <p>Substituting current values:</p>
              <MathBlock math={`s_{${selectedFrameM}} = ${selectedFrameM} \\cdot ${H} = ${startIdx}`} />
              <p>
                The frame interval boundaries <InlineMath math="I_m" /> contain coordinates:
              </p>
              <MathBlock math="I_m = \{s_m, s_m+1, \ldots, s_m+L-1\}" />
              <p>Substituting current indices:</p>
              <MathBlock math={`I_{${selectedFrameM}} = \\{${startIdx}, ${startIdx + 1}, \\ldots, ${endIdxExcl - 1}\\}$`} />
            </div>
          </div>

          {/* Section 3: What is L */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">3</span>
              <span>What is <InlineMath math="L" />?</span>
            </h4>
            <div className="text-xs text-slate-650 space-y-2 font-sans leading-relaxed">
              <p>
                <InlineMath math="L" /> is the <strong>frame length</strong> (in samples).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>It acts as an aperture or window length, selecting exactly <InlineMath math="L" /> global samples.</li>
                <li>By itself, <InlineMath math="L" /> represents discrete sample values and does not dictate duration until the physical sampling rate <InlineMath math="f_s" /> is factored.</li>
              </ul>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl font-sans">
                <span className="font-semibold">Current framing Length:</span> <InlineMath math={`L = ${L}`} />.
                <p className="mt-1">
                  Because the current frame is <InlineMath math={`I_{${selectedFrameM}} = \\{${frameIndicesList.join(', ')}\\}`} />, the windowed interval currently contains exactly <strong className="text-blue-700">{L} samples</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: What is H */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">4</span>
              <span>What is <InlineMath math="H" />?</span>
            </h4>
            <div className="text-xs text-slate-650 space-y-2 font-sans leading-relaxed">
              <p>
                <InlineMath math="H" /> is the <strong>hop interval</strong> (in samples).
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>It defines the shift translation stride for sliding consecutive frames.</li>
                <li>Consecutive stride starts are located at: <InlineMath math={`\\{${renderConsecutiveStarts()}\\}`} />.</li>
              </ul>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 font-sans">
                <p>
                  <span className="font-semibold">Current shift style:</span> <InlineMath math={`H = ${H}`} />.
                </p>
                {isNonOverlapping && (
                  <p className="text-blue-700 font-medium">
                    <InlineMath math="H = L \Rightarrow" /> <strong>Non-overlapping frames.</strong> Each frame starts immediately where the previous block concludes, ensuring perfect adjacent alignment without redundancy.
                  </p>
                )}
                {isOverlapping && (
                  <p className="text-purple-700 font-medium">
                    <InlineMath math="H < L \Rightarrow" /> <strong>Overlapping frames.</strong> Consecutive blocks share a joint overlap subset of exactly <InlineMath math={`${L - H} \\text{ samples}`} />, introducing signal redundancy suitable for smooth spectral analysis.
                  </p>
                )}
                {isGapped && (
                  <p className="text-amber-700 font-medium">
                    <InlineMath math="H > L \Rightarrow" /> <strong>Gaps between frames.</strong> Gapping leaves exactly <InlineMath math={`${H - L} \\text{ unread samples}`} /> between adjacent frames, omitting those sections completely.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: What is local index ell */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">5</span>
              <span>What is the local index <InlineMath math="\\ell" />?</span>
            </h4>
            <div className="text-xs text-slate-655 space-y-2 font-sans leading-relaxed">
              <p>
                <InlineMath math="\\ell" /> is the <strong>local within-frame index</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Unlike global indexes, local offset index always resets to zero for every single frame: <InlineMath math="\\ell \\in \\{0, 1, \\ldots, L-1\\}" />.</li>
                <li>The linear coordinate affine equation that maps local coordinates back to absolute global coordinates is:</li>
              </ul>
              <MathBlock math="g = m \\cdot H + \\ell" />
              <p>Substituting current view values:</p>
              <MathBlock math={`g = ${selectedFrameM} \\cdot ${H} + ${selectedEll} = ${selectedGlobalIndex}`} />
              <p>The signal sequence indexed inside a localized frame buffer is denoted as:</p>
              <MathBlock math="x^{(m)}[\\ell] = x[m \\cdot H + \\ell]" />
              <p>Substituting for the selected offset:</p>
              <MathBlock math={`x^{(${selectedFrameM})}[${selectedEll}] = x[${selectedGlobalIndex}]`} />
            </div>
          </div>

          {/* Section 6: What does fs do */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">6</span>
              <span>What does <InlineMath math="f_s" /> do?</span>
            </h4>
            <div className="text-xs text-slate-655 space-y-2 font-sans leading-relaxed">
              <p>
                <InlineMath math="f_s" /> is the physical <strong>sampling frequency</strong> (sampling rate) in hertz.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>It maps discrete index counts directly into physical continuous seconds of time.</li>
                <li>The physical continuous time of sample <InlineMath math="g" /> is calculated via:</li>
              </ul>
              <MathBlock math="t_g = \frac{g}{f_s}" />
              <p>Substituting current selected sample details:</p>
              <MathBlock math={`t_{${selectedGlobalIndex}} = \\frac{${selectedGlobalIndex}}{${fs}} = ${selectedSampleTime.toFixed(4)}\\text{ s}`} />
              <p>
                The complete observation duration of the entire sequence is:
              </p>
              <MathBlock math={`T_{\\text{observed}} = \\frac{N}{f_s} = \\frac{${N}}{${fs}} = ${observedDuration.toFixed(4)}\\text{ s}`} />
              
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2 font-sans mt-2">
                {sampleCountMode === 'fixed_duration' ? (
                  <p className="text-purple-700 text-xs font-medium">
                    <strong>Fixed Duration Mode is Active:</strong> You configured a physical limit <InlineMath math={`T_{\\text{total}} = ${T_total}\\text{ s}`} />. Therefore, changing <InlineMath math="f_s" /> recomputes the sample size: <InlineMath math={`N = \\lfloor T_{\\text{total}} \\cdot f_s \\rfloor = \\lfloor ${T_total} \\times ${fs} \\rfloor = ${N}`} />. Since duration is pinned, higher <InlineMath math="f_s" /> yields a visibly denser sample spacing.
                  </p>
                ) : (
                  <p className="text-blue-700 text-xs font-medium">
                    <strong>Fixed-N Mode is Active:</strong> The sample count is hard-pinned at <InlineMath math={`N = ${N}`} />. Changing <InlineMath math="f_s" /> adjusts temporal timestamps and the frequencies of deterministic continuous source waves, but doesn't change coordinate index graph density.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 7: Live Selected Sample Calculation Card */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">7</span>
              <span>Selected sample Live Calculations</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50/40 border border-blue-200/60 rounded-xl p-4 font-sans space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-800">Dynamic UI Values</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-blue-100 pb-1">
                    <span className="text-slate-500 font-medium">m (Frame index):</span>
                    <span className="font-mono font-bold text-slate-800">{selectedFrameM}</span>
                  </div>
                  <div className="flex justify-between border-b border-blue-100 pb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <InlineMath math="\\ell" /> (Local relative offset):
                    </span>
                    <span className="font-mono font-bold text-slate-800">{selectedEll}</span>
                  </div>
                  <div className="flex justify-between border-b border-blue-100 pb-1">
                    <span className="text-slate-500 font-medium">L (Frame length):</span>
                    <span className="font-mono font-bold text-slate-800">{L} samples</span>
                  </div>
                  <div className="flex justify-between border-b border-blue-100 pb-1">
                    <span className="text-slate-500 font-medium">H (Hop interval stride):</span>
                    <span className="font-mono font-bold text-slate-800">{H} samples</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">f_s (Sampling rate):</span>
                    <span className="font-mono font-bold text-slate-800">{fs} Hz</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-sm font-sans space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600">Calculated Output Formulations</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <InlineMath math="s_m = m \\cdot H" />
                      <span className="text-slate-400 text-[10px]">(Starting index):</span>
                    </span>
                    <InlineMath math={`s_{${selectedFrameM}} = ${startIdx}`} className="font-mono text-slate-800" />
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <InlineMath math="g = m \\cdot H + \\ell" />
                      <span className="text-slate-400 text-[10px]">(Global index):</span>
                    </span>
                    <InlineMath math={`g = ${selectedGlobalIndex}`} className="font-mono text-slate-800" />
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <InlineMath math="x^{(m)}[\\ell] = x[g]" />
                      <span className="text-slate-400 text-[10px]">(Sample value):</span>
                    </span>
                    <InlineMath math={`x^{(${selectedFrameM})}[${selectedEll}] = ${selectedSampleValue.toFixed(4)}`} className="font-mono text-slate-800" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <InlineMath math="t_g = g / f_s" />
                      <span className="text-slate-400 text-[10px]">(Physical time):</span>
                    </span>
                    <InlineMath math={`t_{${selectedGlobalIndex}} = ${selectedSampleTime.toFixed(4)}\\text{ s}`} className="font-mono text-slate-850 font-bold" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Live Point-wise Index Mapping Visualizer */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">8</span>
              <span>Pointwise Index Mapping for Frame <InlineMath math={`m = ${selectedFrameM}`} /></span>
            </h4>
            <div className="text-xs text-slate-650 space-y-3 font-sans leading-relaxed">
              <p>
                Visualizing how indexing in the selected local buffer maps to the original global baseline sequence registers:
              </p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-4">
                {/* Global vs Local visual alignment */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 text-right">Global Signal:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Array.from({ length: Math.min(N, 16) }).map((_, idx) => {
                        const isCurrentlyInFrame = idx >= startIdx && idx < endIdxExcl;
                        const isCurrentlySelected = idx === selectedGlobalIndex;
                        return (
                          <div
                            key={idx}
                            className={`px-1.5 py-1 text-[10px] font-mono rounded border transition-all flex items-center justify-center min-w-[34px] ${
                              isCurrentlySelected
                                ? 'bg-blue-600 text-white border-blue-600 font-bold scale-110 shadow-xs'
                                : isCurrentlyInFrame
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-white text-slate-400 border-slate-100'
                            }`}
                          >
                            <InlineMath math={`x[${idx}]`} />
                          </div>
                        );
                      })}
                      {N > 16 && <span className="text-[10px] text-slate-400 font-mono">...</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-24 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 text-right">Selected Frame:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Place placeholder pads to shift alignment */}
                      {Array.from({ length: startIdx }).map((_, i) => (
                        <div key={`pad-${i}`} className="w-[34px] h-6 flex items-center justify-center text-slate-300">
                          &middot;
                        </div>
                      ))}
                      {Array.from({ length: L }).map((_, ell) => {
                        const globIdx = startIdx + ell;
                        const isSelectedLocalObj = ell === selectedEll;
                        if (globIdx >= N) return null;
                        return (
                          <div
                            key={ell}
                            className={`px-1.5 py-1 text-[10px] font-mono rounded border text-center transition-all flex items-center justify-center min-w-[34px] ${
                              isSelectedLocalObj
                                ? 'bg-blue-600 text-white border-blue-600 font-bold scale-110 shadow-xs'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            <InlineMath math={`x^{(${selectedFrameM})}[${ell}]`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Pointwise coordinate lines details */}
                <div className="border-t border-slate-200/60 pt-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mapping Equations per sample:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {Array.from({ length: L }).map((_, ell) => {
                      const globIdx = startIdx + ell;
                      const isCurrentlyActiveLine = ell === selectedEll;
                      if (globIdx >= N) return null;

                      return (
                        <div
                          key={`map-line-${ell}`}
                          className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-between gap-1 ${
                            isCurrentlyActiveLine
                              ? 'bg-blue-50/80 border-blue-400 font-medium shadow-2xs'
                              : 'bg-white border-slate-105'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <span className="inline-flex items-center font-semibold"><InlineMath math={`\\ell = ${ell}`} /></span>
                            <span className="text-slate-400 text-[10px]">&rarr;</span>
                            <span className="inline-flex items-center font-semibold"><InlineMath math={`g = ${globIdx}`} /></span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-serif mt-0.5">
                            <InlineMath math={`x^{(${selectedFrameM})}[${ell}] = x[${globIdx}]`} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 9: Concept Check Questions */}
          <div className="pt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 font-sans">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] text-slate-700 font-bold">9</span>
              <span>Mini self-test Concept Check</span>
            </h4>
            
            <div className="space-y-3">
              {/* Question A */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs bg-slate-50/40">
                <button
                  onClick={() => toggleAccordion('a')}
                  className="w-full flex items-center justify-between p-3.5 text-left font-sans font-semibold text-xs text-slate-800 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-blue-500" />
                    <span>Question A: Does <InlineMath math="m" /> select a sample or an interval?</span>
                  </span>
                  {activeCheck === 'a' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeCheck === 'a' && (
                  <div className="p-4 bg-white border-t border-slate-150 text-xs text-slate-650 font-sans leading-relaxed animate-fade-in">
                    <div className="flex gap-2 items-start text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 mb-2 font-semibold">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                      <span>Answer:</span>
                    </div>
                    <p>
                      The frame translation index <InlineMath math="m" /> selects an entire <strong>interval</strong> <InlineMath math="I_m = \{s_m, \dots, s_m + L - 1\}" />, not an isolated sample value. The interval shifts across the timeline to allow local analysis of overlapping or consecutive segments of size <InlineMath math="L" />.
                    </p>
                  </div>
                )}
              </div>

              {/* Question B */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs bg-slate-50/40">
                <button
                  onClick={() => toggleAccordion('b')}
                  className="w-full flex items-center justify-between p-3.5 text-left font-sans font-semibold text-xs text-slate-800 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-blue-500" />
                    <span>Question B: What is the differences between <InlineMath math="g" /> and <InlineMath math="\\ell" />?</span>
                  </span>
                  {activeCheck === 'b' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeCheck === 'b' && (
                  <div className="p-4 bg-white border-t border-slate-150 text-xs text-slate-655 font-sans leading-relaxed animate-fade-in">
                    <div className="flex gap-2 items-start text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 mb-2 font-semibold">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                      <span>Answer:</span>
                    </div>
                    <p>
                      <InlineMath math="g" /> is the <strong>global absolute index</strong> of the discrete signal sequence, spanning the entire sequence length from <InlineMath math="0" /> to <InlineMath math="N-1" />.
                    </p>
                    <p className="mt-1">
                      <InlineMath math="\\ell" /> is the <strong>local relative index</strong> inside the localized frame, ranging from <InlineMath math="0" /> to <InlineMath math="L-1" />. Under consecutive frames, local coordinate offsets translate by offsets using the affine mapping equation: <InlineMath math="g = m \\cdot H + \\ell" />.
                    </p>
                  </div>
                )}
              </div>

              {/* Question C */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs bg-slate-50/40">
                <button
                  onClick={() => toggleAccordion('c')}
                  className="w-full flex items-center justify-between p-3.5 text-left font-sans font-semibold text-xs text-slate-800 hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-blue-500" />
                    <span>Question C: Why do we need <InlineMath math="f_s" />?</span>
                  </span>
                  {activeCheck === 'c' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeCheck === 'c' && (
                  <div className="p-4 bg-white border-t border-slate-150 text-xs text-slate-650 font-sans leading-relaxed animate-fade-in">
                    <div className="flex gap-2 items-start text-emerald-750 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 mb-2 font-semibold">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                      <span>Answer:</span>
                    </div>
                    <p>
                      The sampling rate <InlineMath math="f_s" /> represents the number of samples captured per second of physical time. We need it to convert discrete indexes (<InlineMath math="g" />) into their appropriate real-world continuous physical standard timescale (seconds) under the linear equation:
                    </p>
                    <MathBlock math="t_g = \frac{g}{f_s}" />
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};
