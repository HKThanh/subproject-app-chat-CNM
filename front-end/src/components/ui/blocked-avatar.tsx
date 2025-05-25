import React from 'react';

interface BlockedAvatarProps {
  src: string;
  alt: string;
  isBlocked?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5', 
  xl: 'w-6 h-6'
};

const svgSizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4'
};

export const BlockedAvatar: React.FC<BlockedAvatarProps> = ({
  src,
  alt,
  isBlocked = false,
  size = 'md',
  className = '',
  onError
}) => {
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative ${className}`}>
      <img
        src={src || "/default-avatar.png"}
        alt={alt}
        className="w-full h-full object-cover"
        onError={onError || ((e) => {
          (e.target as HTMLImageElement).src = "/default-avatar.png";
        })}
      />
      {/* Icon cấm ở góc dưới phải */}
      {isBlocked && (
        <div className={`absolute -bottom-0.5 -right-0.5 ${iconSizeClasses[size]} bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg`}>
          <svg 
            className={`${svgSizeClasses[size]} text-white`}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM10 18a8 8 0 100-16 8 8 0 000 16z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      )}
    </div>
  );
};
