import { clsx } from 'clsx';
import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '../app/ThemeContext';
import { useAuth } from '../app/AuthContext';
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
    'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium tracking-tight shadow-sm transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-body)] text-[color:var(--color-foreground)]/95 hover:text-[color:var(--color-foreground)]';

  const palette =
    variant === 'fab'
      ? 'bg-[color:var(--color-surface)] border-[color:var(--color-border)] shadow-[var(--shadow-elevated)] hover:bg-[color:var(--color-surface-hover)]/90 backdrop-blur-md'
      : 'bg-[color:var(--color-surface)] border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-hover)]/90';

  const padding =
    variant === 'fab' ? 'px-4 py-3 sm:px-5 sm:py-3.5' : 'px-2.5 py-2 sm:px-3 sm:py-2';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      {...buttonProps}
      className={clsx(base, palette, padding, className)}
    >
      {isDark ? <SunMedium size={18} /> : <MoonStar size={18} />}
      {showLabel ? (
        <span className="hidden sm:inline whitespace-nowrap">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
      ) : null}
    </button>
  );
}

export function FloatingThemeToggle() {
  const { profile, loading } = useAuth();

  if (loading || profile) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[80] sm:bottom-8 sm:right-8">
      <ThemeToggleButton variant="fab" showLabel />
    </div>
  );
}
