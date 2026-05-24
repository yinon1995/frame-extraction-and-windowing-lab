import React from 'react';

export default function AppFooter(): React.ReactElement {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-6 px-4 mt-auto shrink-0 shadow-3xs" id="app-footer">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-1.5 font-sans">
        <p className="text-xs font-semibold text-slate-700">
          Created by <span className="text-slate-900 font-black">Yinon Coscas</span>
        </p>
        <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
          Educational use only. This interactive lab is intended for learning and technical study. 
          If you find a mathematical, technical, or implementation error, please contact:{' '}
          <a 
            href="mailto:yinoncoscas1995@gmail.com"
            className="text-blue-600 hover:text-blue-800 font-bold underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            title="Send feedback to Yinon Coscas"
          >
            yinoncoscas1995@gmail.com
          </a>
        </p>
      </div>
    </footer>
  );
}
