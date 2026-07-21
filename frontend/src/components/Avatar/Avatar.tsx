import { getApiOrigin } from '../../services/api';

interface AvatarProps {
  src: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ src, name, size = 'md' }: AvatarProps): JSX.Element {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={`${getApiOrigin()}${src}`}
        alt={name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-ink-100 font-medium text-ink-700`}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
