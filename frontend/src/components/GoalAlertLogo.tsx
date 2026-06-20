interface GoalAlertLogoProps {
  size?: number;
}

export function GoalAlertLogo({ size = 28 }: GoalAlertLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Campo de futebol (tática) */}
      <rect x="3" y="5" width="26" height="22" rx="2.5" fill="#1e293b" stroke="#facc15" strokeWidth="1.2"/>
      {/* Linha central */}
      <line x1="16" y1="5" x2="16" y2="27" stroke="#facc15" strokeWidth="0.8" strokeOpacity="0.5"/>
      {/* Círculo central */}
      <circle cx="16" cy="16" r="4" stroke="#facc15" strokeWidth="0.8" strokeOpacity="0.5" fill="none"/>
      {/* Seta tática — ataque */}
      <path d="M7 20 L13 13 L19 17 L25 10" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polygon points="25,10 21,10 25,14" fill="#facc15"/>
    </svg>
  );
}
