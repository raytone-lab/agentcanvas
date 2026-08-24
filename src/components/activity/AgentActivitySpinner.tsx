export type AgentActivityVariant = "thinking" | "waiting" | "running";

export type AgentActivitySpinnerProps = {
  variant: AgentActivityVariant;
  size?: "sm" | "md" | "lg";
  active?: boolean;
};

export function AgentActivitySpinner({
  variant,
  size = "sm",
  active = true,
}: AgentActivitySpinnerProps) {
  const boxSize = size === "lg" ? 24 : size === "md" ? 18 : 14;

  if (variant === "thinking" || variant === "waiting") {
    const dot = size === "lg" ? 7 : size === "md" ? 5 : 4;
    const gap = size === "lg" ? 5 : size === "md" ? 4 : 3;
    const width = dot * 3 + gap * 2;
    return (
      <span className="activity-dots" data-active={active} data-variant={variant} style={{ width, height: boxSize, gap }}>
        {[0, 1, 2].map((index) => (
          <span key={index} style={{ width: dot, height: dot }} />
        ))}
      </span>
    );
  }

  const r = (boxSize - 4) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <span className="activity-spinner" data-active={active} style={{ width: boxSize, height: boxSize }}>
      <svg width={boxSize} height={boxSize} viewBox={`0 0 ${boxSize} ${boxSize}`}>
        <circle
          cx={boxSize / 2}
          cy={boxSize / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${circ * 0.3} ${circ * 0.7}`}
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}
