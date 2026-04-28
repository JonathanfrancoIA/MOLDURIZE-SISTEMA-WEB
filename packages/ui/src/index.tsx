/**
 * MOLDURIZE WEB — UI Component Library
 * Reusable React components with Tailwind styling.
 */
import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════════════════

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-white/5 border border-white/20 text-white hover:bg-white/10 disabled:opacity-40",
  ghost: "text-white/70 hover:text-white hover:bg-white/5",
  danger:
    "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

// ═══════════════════════════════════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════════════════════════════════

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-[#161616] border border-white/10 rounded-2xl p-6",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-white mb-2", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-white/50 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// ═══════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs text-white/50 block mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full bg-[#0f0f0f] border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none transition-colors",
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-white/20 focus:border-yellow-400/50",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ═══════════════════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════════════════

type BadgeVariant = "default" | "success" | "warning" | "danger" | "yellow";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-white/5 border-white/10 text-white/60",
  success: "bg-green-500/10 border-green-500/20 text-green-400",
  warning: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  danger: "bg-red-500/10 border-red-500/20 text-red-400",
  yellow: "bg-yellow-400/10 border-yellow-400/20 text-yellow-400",
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}) => (
  <span
    className={cn(
      "inline-flex items-center text-xs border rounded-full px-2.5 py-0.5 font-medium",
      BADGE_VARIANTS[variant],
      className
    )}
    {...props}
  />
);

// ═══════════════════════════════════════════════════════════════════════════
// ALERT
// ═══════════════════════════════════════════════════════════════════════════

type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

const ALERT_VARIANTS: Record<AlertVariant, string> = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  success: "bg-green-500/10 border-green-500/20 text-green-400",
  warning: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  error: "bg-red-500/10 border-red-500/20 text-red-400",
};

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = "info",
  title,
  children,
  ...props
}) => (
  <div
    className={cn(
      "border rounded-lg p-3 text-sm",
      ALERT_VARIANTS[variant],
      className
    )}
    {...props}
  >
    {title && <div className="font-semibold mb-0.5">{title}</div>}
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// STAT
// ═══════════════════════════════════════════════════════════════════════════

export interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({ label, value, hint, className }) => (
  <div className={cn("bg-[#161616] border border-white/10 rounded-xl p-4", className)}>
    <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    {hint && <p className="text-xs text-white/30 mt-1">{hint}</p>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════════════

export const Spinner: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className,
}) => (
  <div
    className={cn(
      "border-2 border-yellow-400 border-t-transparent rounded-full animate-spin",
      className
    )}
    style={{ width: size, height: size }}
  />
);

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "📂",
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center py-16 px-4",
      className
    )}
  >
    <div className="text-6xl mb-4 opacity-20">{icon}</div>
    <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-white/50 max-w-sm mb-6">{description}</p>
    )}
    {action}
  </div>
);
