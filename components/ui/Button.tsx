import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "yellow" | "ghost" | "danger";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-blue-deep text-cream hover:bg-blue-DEFAULT active:translate-y-[2px]",
  secondary: "bg-blue-pale text-blue-deep hover:bg-blue-light/30 active:translate-y-[2px]",
  yellow: "bg-yellow-vivid text-ink hover:brightness-95 active:translate-y-[2px]",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  danger: "bg-red-600 text-white hover:bg-red-700 active:translate-y-[2px]",
};

const sizeClasses: Record<Size, string> = {
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-lg",
};

/**
 * Bouton large et arrondi, pensé pour être touché confortablement
 * d'une seule main sur mobile. Un léger décalage vertical au clic
 * simule un effet "carte de jeu" sans animation longue.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "lg", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "w-full rounded-2xl font-display font-medium shadow-card transition-all duration-150",
          "disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed disabled:active:translate-y-0",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
