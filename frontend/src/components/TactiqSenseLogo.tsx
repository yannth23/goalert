interface TactiqSenseLogoProps {
  size?: number;
}

export function TactiqSenseLogo({ size = 28 }: TactiqSenseLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trave (goalpost) */}
      <rect x="3" y="6" width="2" height="16" rx="1" fill="#facc15"/>
      <rect x="3" y="6" width="16" height="2" rx="1" fill="#facc15"/>
      <rect x="17" y="6" width="2" height="16" rx="1" fill="#facc15"/>
      {/* Rede (net lines) */}
      <line x1="5" y1="10" x2="17" y2="10" stroke="#facc15" strokeWidth="0.7" strokeOpacity="0.4"/>
      <line x1="5" y1="14" x2="17" y2="14" stroke="#facc15" strokeWidth="0.7" strokeOpacity="0.4"/>
      <line x1="5" y1="18" x2="17" y2="18" stroke="#facc15" strokeWidth="0.7" strokeOpacity="0.4"/>
      <line x1="9" y1="8" x2="9" y2="22" stroke="#facc15" strokeWidth="0.7" strokeOpacity="0.4"/>
      <line x1="13" y1="8" x2="13" y2="22" stroke="#facc15" strokeWidth="0.7" strokeOpacity="0.4"/>
      {/* Sino (bell) */}
      <path d="M24 11c-2.2 0-4 1.8-4 4v3l-1 1.5h10l-1-1.5v-3c0-2.2-1.8-4-4-4z" fill="#facc15"/>
      <path d="M22.5 19.5a1.5 1.5 0 003 0" fill="#facc15"/>
      {/* Badge de alerta */}
      <circle cx="27" cy="10" r="3" fill="#ef4444"/>
      <text x="27" y="11" textAnchor="middle" dominantBaseline="middle" fontSize="4" fontWeight="bold" fill="white">!</text>
    </svg>
  );
}
