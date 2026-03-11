"use client";

export function TriTree() {
  return (
    <svg
      width="120"
      height="140"
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-black dark:text-white"
    >
      <style>{`
        .trunk { stroke-dasharray: 60; stroke-dashoffset: 60; animation: draw 0.5s ease forwards; }
        .branch-l { stroke-dasharray: 50; stroke-dashoffset: 50; animation: draw 0.4s ease 0.4s forwards; }
        .branch-r { stroke-dasharray: 50; stroke-dashoffset: 50; animation: draw 0.4s ease 0.5s forwards; }
        .branch-c { stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw 0.4s ease 0.3s forwards; }
        .leaf { opacity: 0; animation: bloom 0.4s ease forwards; }
        .leaf-l { animation-delay: 0.75s; }
        .leaf-r { animation-delay: 0.85s; }
        .leaf-c { animation-delay: 0.65s; }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes bloom {
          0%   { opacity: 0; transform: scale(0.4); }
          60%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Trunk */}
      <line
        className="trunk"
        x1="60" y1="130" x2="60" y2="75"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      />

      {/* Branch left */}
      <line
        className="branch-l"
        x1="60" y1="95" x2="25" y2="65"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />

      {/* Branch right */}
      <line
        className="branch-r"
        x1="60" y1="95" x2="95" y2="65"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />

      {/* Branch center */}
      <line
        className="branch-c"
        x1="60" y1="75" x2="60" y2="45"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />

      {/* Leaf left */}
      <g className="leaf leaf-l" style={{ transformOrigin: "25px 50px" }}>
        <ellipse
          cx="25" cy="50" rx="14" ry="18"
          fill="currentColor" opacity="0.12"
          stroke="currentColor" strokeWidth="1.5"
          transform="rotate(-20 25 50)"
        />
        <line x1="25" y1="65" x2="25" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.3" transform="rotate(-20 25 50)" />
      </g>

      {/* Leaf right */}
      <g className="leaf leaf-r" style={{ transformOrigin: "95px 50px" }}>
        <ellipse
          cx="95" cy="50" rx="14" ry="18"
          fill="currentColor" opacity="0.12"
          stroke="currentColor" strokeWidth="1.5"
          transform="rotate(20 95 50)"
        />
        <line x1="95" y1="65" x2="95" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.3" transform="rotate(20 95 50)" />
      </g>

      {/* Leaf center (top) */}
      <g className="leaf leaf-c" style={{ transformOrigin: "60px 28px" }}>
        <ellipse
          cx="60" cy="28" rx="14" ry="18"
          fill="currentColor" opacity="0.12"
          stroke="currentColor" strokeWidth="1.5"
        />
        <line x1="60" y1="45" x2="60" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </g>

      {/* Root lines */}
      <line x1="60" y1="130" x2="40" y2="138" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="60" y1="130" x2="80" y2="138" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}
