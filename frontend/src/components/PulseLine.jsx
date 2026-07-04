/**
 * The signature visual element: a heartbeat-style stroke that literalizes
 * "CampusPulse". Used as a section divider (static) and, with `animate`,
 * as the loading/live-indicator motif instead of a generic spinner.
 */
export default function PulseLine({ animate = false, color = "var(--amber)" }) {
  return (
    <svg className="pulse-divider" viewBox="0 0 600 20" preserveAspectRatio="none">
      <polyline
        points="0,10 220,10 240,2 260,18 280,10 320,10 340,2 360,18 380,10 600,10"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          animate
            ? { strokeDasharray: 600, strokeDashoffset: 600, animation: "pulse-draw 1.8s ease-in-out infinite" }
            : undefined
        }
      />
      {animate && (
        <style>{`
          @keyframes pulse-draw {
            0% { stroke-dashoffset: 600; }
            60% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -600; }
          }
        `}</style>
      )}
    </svg>
  );
}
