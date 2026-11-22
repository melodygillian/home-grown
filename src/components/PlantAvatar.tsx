import { useState } from 'react';
import type { NativePlant } from '../types/garden';
import { PlantIllustration } from './PlantIllustration';

interface PlantAvatarProps {
  plant: NativePlant;
  size?: number;
  rounded?: 'lg' | 'full';
  className?: string;
}

function isSafeImageUrl(url?: string | null): url is string {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('http://');
}

export function PlantAvatar({
  plant,
  size = 44,
  rounded = 'lg',
  className = '',
}: PlantAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const canShowPhoto = isSafeImageUrl(plant.photoUrl) && !imgFailed;
  const radiusClass = rounded === 'full' ? 'rounded-full' : 'rounded-lg';

  return (
    <div
      style={{ width: size, height: size }}
      className={`overflow-hidden shrink-0 flex items-center justify-center bg-[#F3F7F4] border border-[#DCE5DF] ${radiusClass} ${className}`}
    >
      {canShowPhoto ? (
        <img
          src={plant.photoUrl!}
          alt={`${plant.name} (${plant.sci})`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <PlantIllustration plant={plant} size={Math.max(24, Math.round(size * 0.82))} />
      )}
    </div>
  );
}
