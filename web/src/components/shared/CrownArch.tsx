/**
 * The logo: a stylised horseshoe arch framing a hanging votive crown (Guarrazar). Used large on
 * the assistant welcome and small as the brand mark in the navigation.
 */
export function CrownArch({ className = "h-28 w-32 md:h-32 md:w-36" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 140"
      className={`text-accent ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* horseshoe arch with voussoirs */}
      <path d="M22 136V66a58 58 0 0 1 116 0v70" strokeWidth={2} />
      <path d="M36 136V68a44 44 0 0 1 88 0v68" strokeWidth={1.4} opacity={0.6} />
      {[-60, -40, -20, 0, 20, 40, 60].map((deg) => (
        <line
          key={deg}
          x1={80 + 44 * Math.sin((deg * Math.PI) / 180)}
          y1={68 - 44 * Math.cos((deg * Math.PI) / 180)}
          x2={80 + 58 * Math.sin((deg * Math.PI) / 180)}
          y2={66 - 58 * Math.cos((deg * Math.PI) / 180)}
          strokeWidth={1.2}
          opacity={0.6}
        />
      ))}
      {/* chains */}
      <path d="M80 26v18M80 44 62 58M80 44l18 14M80 44v14" strokeWidth={1.2} strokeDasharray="2 2.5" />
      {/* crown band */}
      <ellipse cx="80" cy="60" rx="20" ry="4" fill="var(--accent-soft)" strokeWidth={1.6} />
      <path d="M60 60v14a20 4 0 0 0 40 0V60" fill="var(--accent-soft)" strokeWidth={1.6} />
      {[66, 73, 80, 87, 94].map((x) => (
        <circle key={x} cx={x} cy={68} r={1.8} fill="currentColor" stroke="none" />
      ))}
      {/* hanging pendants */}
      {[64, 72, 80, 88, 96].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={77} x2={x} y2={i % 2 ? 90 : 96} strokeWidth={1} />
          <path d={`M${x} ${i % 2 ? 90 : 96}l-2.5 4 2.5 4 2.5-4z`} fill="currentColor" stroke="none" />
        </g>
      ))}
      {/* central cross */}
      <path d="M80 102v18M73 108h14" strokeWidth={1.8} />
    </svg>
  );
}
