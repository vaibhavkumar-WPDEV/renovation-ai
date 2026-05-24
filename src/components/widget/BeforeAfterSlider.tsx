"use client";
import { useState } from "react";

interface Props {
  before: string;
  after: string;
}

export function BeforeAfterSlider({ before, after }: Props) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "4/3" }}>
      {/* After image (full width baseline) */}
      <img
        src={after}
        alt="After AI redesign"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* Before image clipped to left of slider */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={before}
          alt="Before"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Divider */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 7H1M1 7L3 5M1 7L3 9M10 7H13M13 7L11 5M13 7L11 9" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        Before
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        After
      </div>

      {/* Invisible range input over everything */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-col-resize opacity-0"
        aria-label="Drag to compare before and after"
      />
    </div>
  );
}
