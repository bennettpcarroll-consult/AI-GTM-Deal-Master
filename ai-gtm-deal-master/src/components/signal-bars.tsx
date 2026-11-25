/** Four ascending bars. 1 = assumed, 3 = partial signal, 4 = verbatim proof (emerald). */
export function SignalBars({ bars, color, label }: { bars: number; color: string; label?: string }) {
  const filled = bars >= 4 ? '#10B981' : color;
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" role="img" aria-label={`${bars} of 4 signal bars${label ? `, ${label}` : ''}`}>
      {[0, 1, 2, 3].map((index) => {
        const height = (index + 1) * 4;
        return (
          <rect
            key={index}
            x={index * 6}
            y={16 - height}
            width="4"
            height={height}
            rx="1"
            fill={index < bars ? filled : '#E5E7EB'}
          />
        );
      })}
    </svg>
  );
}
