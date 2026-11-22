import type { NativePlant } from '../types/garden';

interface PlantIllustrationProps {
  plant: NativePlant;
  size?: number;
  className?: string;
}

export function PlantIllustration({ plant, size = 40, className = '' }: PlantIllustrationProps) {
  if (plant.category === 'perennial') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        className={className}
        aria-hidden="true"
      >
        <circle cx="22" cy="22" r="18" fill="#1B4332" opacity="0.16" />
        {/* Basal leaves */}
        <path
          d="M22 22 L10 12 M22 22 L34 12 M22 22 L36 24 M22 22 L31 35 M22 22 L13 35 M22 22 L8 24"
          stroke="#1B4332"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* 5 petals */}
        <circle cx="22" cy="12" r="5.5" fill={plant.color} stroke="#14261C" strokeWidth="0.9" />
        <circle cx="31.5" cy="19" r="5.5" fill={plant.color} stroke="#14261C" strokeWidth="0.9" />
        <circle cx="28" cy="30" r="5.5" fill={plant.color} stroke="#14261C" strokeWidth="0.9" />
        <circle cx="16" cy="30" r="5.5" fill={plant.color} stroke="#14261C" strokeWidth="0.9" />
        <circle cx="12.5" cy="19" r="5.5" fill={plant.color} stroke="#14261C" strokeWidth="0.9" />
        {/* Center */}
        <circle cx="22" cy="22" r="4.8" fill={plant.accentColor} stroke="#78350F" strokeWidth="0.9" />
        <circle cx="22" cy="22" r="1.8" fill="#78350F" />
      </svg>
    );
  }

  if (plant.category === 'grass') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        className={className}
        aria-hidden="true"
      >
        <circle cx="22" cy="22" r="17" fill="#3F6212" opacity="0.14" />
        <path
          d="M22 36 Q15 20 7 12 M22 36 Q18 18 14 7 M22 36 Q22 16 22 6 M22 36 Q26 18 30 7 M22 36 Q29 20 37 12"
          fill="none"
          stroke={plant.color}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M22 36 Q12 25 9 20 M22 36 Q32 25 35 20"
          fill="none"
          stroke={plant.accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="22" cy="36" rx="8.5" ry="3" fill="#2D6A4F" />
      </svg>
    );
  }

  if (plant.category === 'shrub') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        className={className}
        aria-hidden="true"
      >
        <circle cx="22" cy="23" r="16" fill="#1B4332" stroke="#14261C" strokeWidth="1.2" />
        <circle cx="15" cy="19" r="8" fill="#2D6A4F" />
        <circle cx="29" cy="19" r="8" fill="#2D6A4F" />
        <circle cx="22" cy="14" r="7" fill="#40916C" />
        <circle cx="22" cy="27" r="7.5" fill="#2D6A4F" />
        {/* Flowers / berries */}
        <circle cx="15" cy="15" r="2.6" fill={plant.color} stroke="#14261C" strokeWidth="0.6" />
        <circle cx="28" cy="17" r="2.6" fill={plant.color} stroke="#14261C" strokeWidth="0.6" />
        <circle cx="22" cy="25" r="2.6" fill={plant.color} stroke="#14261C" strokeWidth="0.6" />
        <circle cx="14" cy="26" r="2.2" fill={plant.accentColor} />
        <circle cx="30" cy="26" r="2.2" fill={plant.accentColor} />
      </svg>
    );
  }

  // Fern
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className={className}
      aria-hidden="true"
    >
      <circle cx="22" cy="22" r="17" fill="#15803D" opacity="0.14" />
      <path
        d="M22 36 C21 24 15 14 9 9 M22 36 C22 21 22 13 22 6 M22 36 C23 24 29 14 35 9"
        fill="none"
        stroke={plant.color}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M12 16 L18 15 M11 22 L18 22 M14 28 L19 28 M32 16 L26 15 M33 22 L26 22 M30 28 L25 28 M18 12 L22 11 L26 12"
        stroke={plant.accentColor}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
