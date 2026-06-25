"use client";

import { useRef } from "react";

interface PinKeypadProps {
  pin: string;
  onPinChange: (pin: string) => void;
  length?: number;
  error?: boolean;
}

export default function PinKeypad({ pin, onPinChange, length = 6, error }: PinKeypadProps) {
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handlePress = (digit: string) => {
    if (pin.length < length) {
      // Trigger press animation
      const btn = btnRefs.current.get(digit);
      if (btn) {
        btn.classList.remove("keypad-press");
        void btn.offsetWidth;
        btn.classList.add("keypad-press");
      }
      onPinChange(pin + digit);
    }
  };

  const handleDelete = () => {
    onPinChange(pin.slice(0, -1));
  };

  return (
    <div className="animate-fade-in">
      {/* Dots */}
      <div className={`flex justify-center gap-4 mb-8 ${error ? "animate-shake" : ""}`}>
        {Array.from({ length }).map((_, i) => (
          <div key={i} className="relative">
            <div
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? "bg-indigo-500 dot-fill shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                  : "bg-slate-200"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            ref={(el) => { if (el) btnRefs.current.set(digit, el); }}
            type="button"
            onClick={() => handlePress(digit)}
            className="h-[68px] rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 text-2xl font-semibold text-slate-800 active:bg-indigo-100 active:scale-[0.93] transition-all duration-100 shadow-sm hover:shadow-md"
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          ref={(el) => { if (el) btnRefs.current.set("0", el); }}
          type="button"
          onClick={() => handlePress("0")}
          className="h-[68px] rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 text-2xl font-semibold text-slate-800 active:bg-indigo-100 active:scale-[0.93] transition-all duration-100 shadow-sm hover:shadow-md"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="h-[68px] rounded-2xl bg-white/40 border border-white/40 flex items-center justify-center active:bg-rose-50 active:scale-[0.93] transition-all duration-100"
        >
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
