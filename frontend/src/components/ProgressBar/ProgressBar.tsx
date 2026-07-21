interface ProgressBarProps {
  /** 0-100. Значения вне диапазона зажимаются — вызывающий код (backend) уже гарантирует 0-100, но компонент не должен молча уродовать вёрстку при непредвиденном значении. */
  value: number;
  label?: string;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, label, size = 'md' }: ProgressBarProps): JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div>
      {label && (
        <div className={`mb-1 flex items-center justify-between ${textSize}`}>
          <span className="font-medium text-ink-700">{label}</span>
          <span className="font-medium text-ink-900">{clampedValue}%</span>
        </div>
      )}
      <div className={`${barHeight} overflow-hidden rounded-full bg-ink-100`}>
        <div
          className="h-full rounded-full bg-ink-900 transition-all"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
