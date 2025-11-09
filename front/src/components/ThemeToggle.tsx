import { clsx } from 'clsx';
import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '../app/ThemeContext';
import type { ComponentProps } from 'react';

interface ThemeToggleButtonProps extends ComponentProps<'button'> {
  showLabel?: boolean;
  variant?: 'toolbar' | 'fab';
}

export function ThemeToggleButton({
  className,
  showLabel = false,
  variant = 'toolbar',
  ...buttonProps
}: ThemeToggleButtonProps) {
  const { isDark, toggleTheme } = useTheme();

  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-body)] text-[color:var(--color-foreground)] opacity-95 hover:opacity-100';

  const palette =
    variant === 'fab'
      ? 'bg-[color:var(--color-surface)] border-[color:var(--color-border)] shadow-lg hover:bg-[color:var(--color-surface-hover)] backdrop-blur'
      : 'bg-[color:var(--color-surface)] border-[color:var(--color-border)] shadow-sm hover:bg-[color:var(--color-surface-hover)]';

  const padding =
    variant === 'fab' ? 'px-4 py-3 text-sm sm:px-5 sm:py-3.5' : 'px-3 py-2 text-sm';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      {...buttonProps}
      className={clsx(base, palette, padding, className)}
    >
      {isDark ? <SunMedium size={18} /> : <MoonStar size={18} />}
      {showLabel ? <span className="hidden sm:inline">{isDark ? 'Modo claro' : 'Modo oscuro'}</span> : null}
    </button>
  );
}

export function FloatingThemeToggle() {
  return (
    <div className="fixed bottom-6 right-6 z-[80] sm:bottom-8 sm:right-8">
      <ThemeToggleButton variant="fab" showLabel className="shadow-[var(--shadow-elevated)]" />
    </div>
  );
}
