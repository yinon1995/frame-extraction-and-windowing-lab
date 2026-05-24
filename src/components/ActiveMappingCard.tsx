/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LabState } from '../math/framing';
import { InlineMath, MathBlock } from './Math';

interface ActiveMappingCardProps {
  labState: LabState;
}

interface DrawerMathRowProps {
  label: string;
  formula: string;
  value: string;
  scrollableValue?: boolean;
}

const DrawerMathRow: React.FC<DrawerMathRowProps> = ({ label, formula, value, scrollableValue = false }) => {
  return (
    <div className="space-y-1.5 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
      <div className="text-xs font-semibold text-slate-700 font-sans">
        {label}
      </div>

      <div className="drawer-math-box rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2 flex items-center justify-center min-h-[38px]">
        <InlineMath
          math={formula}
          className="drawer-math-display text-[11px] text-slate-500 font-medium"
        />
      </div>

      <div className={`${scrollableValue ? 'drawer-math-box-scroll' : 'drawer-math-box'} rounded-lg bg-blue-50/60 border border-blue-100 px-2.5 py-2 flex items-center justify-center min-h-[38px]`}>
        <InlineMath
          math={value}
          className="drawer-math-display text-xs font-bold text-blue-700"
        />
      </div>
    </div>
  );
};

export const ActiveMappingCard: React.FC<ActiveMappingCardProps> = ({ labState }) => {
  const {
    selectedFrameM: m,
    selectedEll: ell,
    selectedGlobalIndex: g,
    selectedSampleValue: val,
    H,
    fs,
  } = labState;

  const s_m = m * H;

  return (
    <div id="active-mapping-card" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase font-sans">
          Active Mapping
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Real-time indices & sample value translation.
        </p>
      </div>

      <div className="space-y-4 animate-fade-in">
        <DrawerMathRow
          label="Frame Start Index"
          formula={"s_m=mH"}
          value={`s_{${m}}=${m}\\cdot${H}=${s_m}`}
        />

        <DrawerMathRow
          label="Global Index"
          formula={"g=mH+\\ell"}
          value={`g=${m}\\cdot${H}+${ell}=${g}`}
        />

        <DrawerMathRow
          label="Discrete Sample Value"
          formula={"x^{(m)}[\\ell]=x[g]"}
          value={`x^{(${m})}[${ell}]=x[${g}]=${val.toFixed(4)}`}
        />

        <DrawerMathRow
          label="Continuous Time"
          formula={"t_g=g/f_s"}
          value={`t_{${g}}=${g}/${fs}=${(g / fs).toFixed(3)}\\,\\mathrm{s}`}
        />
      </div>
    </div>
  );
};
