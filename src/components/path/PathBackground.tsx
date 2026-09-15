/** Soft cartoon world behind the learning path — CSS/SVG only, no external assets. */
export function PathBackground() {
  return (
    <div className="path-world pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#C8E9FF_0%,#E8F7FF_38%,#F3FFE8_72%,#D8F5C8_100%)]" />

      {/* Soft clouds */}
      <Cloud className="left-[6%] top-[8%] h-10 w-24 opacity-80" />
      <Cloud className="right-[8%] top-[14%] h-8 w-20 opacity-70" />
      <Cloud className="left-[18%] top-[22%] h-7 w-16 opacity-55" />
      <Cloud className="right-[22%] top-[4%] h-9 w-[5.5rem] opacity-65" />

      {/* Decorative sparkles */}
      <Sparkle className="left-[12%] top-[36%] text-amber-300/70" />
      <Sparkle className="right-[14%] top-[48%] text-pink-300/70" />
      <Sparkle className="left-[78%] top-[28%] text-violet-300/60" />

      {/* Hills */}
      <svg className="absolute inset-x-0 bottom-0 h-[42%] w-full" viewBox="0 0 400 180" preserveAspectRatio="none">
        <ellipse cx="60" cy="160" rx="120" ry="70" fill="#A8E08A" />
        <ellipse cx="200" cy="170" rx="150" ry="80" fill="#8FD46B" />
        <ellipse cx="340" cy="155" rx="130" ry="75" fill="#B6EB92" />
        <ellipse cx="120" cy="175" rx="90" ry="45" fill="#7BC85A" opacity="0.55" />
      </svg>

      {/* Simple trees / flowers along the base */}
      <Tree className="bottom-[6%] left-[5%]" />
      <Tree className="bottom-[5%] right-[7%]" scale={0.85} />
      <Flower className="bottom-[7%] left-[18%]" color="#F9A8D4" />
      <Flower className="bottom-[8%] right-[20%]" color="#FDE68A" />
      <Flower className="bottom-[6%] left-[78%]" color="#C4B5FD" />
    </div>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <div className={`absolute ${className ?? ""}`}>
      <div className="absolute inset-0 rounded-full bg-white/85 blur-[0.5px]" />
      <div className="absolute -start-3 top-1 h-[70%] w-[45%] rounded-full bg-white/80" />
      <div className="absolute -end-2 top-0.5 h-[65%] w-[40%] rounded-full bg-white/75" />
    </div>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <span className={`absolute text-lg leading-none ${className ?? ""}`}>✦</span>
  );
}

function Tree({ className, scale = 1 }: { className?: string; scale?: number }) {
  return (
    <div className={`absolute ${className ?? ""}`} style={{ transform: `scale(${scale})` }}>
      <div className="mx-auto h-5 w-2 rounded-sm bg-[#8B5A2B]" />
      <div className="-mt-1 h-10 w-10 rounded-full bg-[#5DBE6A] shadow-[inset_-4px_-4px_0_rgba(0,0,0,0.06)]" />
      <div className="-mt-6 ms-2 h-8 w-8 rounded-full bg-[#6FCF7A]" />
    </div>
  );
}

function Flower({ className, color }: { className?: string; color: string }) {
  return (
    <div className={`absolute ${className ?? ""}`}>
      <div className="relative h-5 w-5">
        <span className="absolute inset-1 rounded-full" style={{ background: color }} />
        <span className="absolute start-0 top-1.5 h-2.5 w-2.5 rounded-full opacity-90" style={{ background: color }} />
        <span className="absolute end-0 top-1.5 h-2.5 w-2.5 rounded-full opacity-90" style={{ background: color }} />
        <span className="absolute inset-x-1.5 top-0 h-2.5 w-2.5 rounded-full opacity-90" style={{ background: color }} />
        <span className="absolute inset-1.5 bottom-0 h-2 w-2 rounded-full bg-amber-300" />
      </div>
      <div className="mx-auto h-3 w-0.5 bg-emerald-500/70" />
    </div>
  );
}
