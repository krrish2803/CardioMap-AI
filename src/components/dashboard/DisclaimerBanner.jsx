import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200/90 shadow-sm z-30">
      <div className="flex items-center gap-2.5 max-w-5xl mx-auto w-full">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-medium tracking-wide">
          <strong className="text-amber-300 font-semibold mr-1.5 uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
            Clinical Advisory
          </strong>
          Decision support / educational use only. Not a substitute for formal diagnostic imaging or clinical judgement.
        </span>
      </div>
    </div>
  );
}
