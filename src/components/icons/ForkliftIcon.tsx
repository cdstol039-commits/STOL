import React from 'react';

interface ForkliftIconProps {
  className?: string;
  size?: number;
}

/**
 * Custom SVG icon representing an industrial forklift (montacargas)
 * Featuring the mast, lifting carriage, forks, roll cage / cabin, chassis, and wheels.
 */
export const ForkliftIcon: React.FC<ForkliftIconProps> = ({
  className = 'w-4 h-4',
  size,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Front vertical mast */}
      <line x1="17" y1="2" x2="17" y2="19" />
      
      {/* Lifting carriage on mast */}
      <line x1="16" y1="9" x2="18" y2="9" />
      
      {/* Fork: extending forward and flat on ground level */}
      <path d="M17 14h4a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1h-4" fill="currentColor" strokeWidth="1.5" />

      {/* Cabin / Overhead Guard & Chassis */}
      {/* Back counterweight curve to roof */}
      <path d="M4 17V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4h5" />
      
      {/* Seat / operator cage bar */}
      <path d="M8 12h3" />
      <line x1="9" y1="8" x2="9" y2="12" />

      {/* Rear Wheel */}
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="5" cy="18" r="0.8" fill="currentColor" />

      {/* Front Drive Wheel */}
      <circle cx="14" cy="18" r="2.5" />
      <circle cx="14" cy="18" r="0.8" fill="currentColor" />
    </svg>
  );
};
