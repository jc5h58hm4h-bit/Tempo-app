import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "yellow" | "ghost" | "danger";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Style rétro : contour épais + arête pleine en dessous (relief "touche de
// clavier"). Au clic, le bouton s'enfonce et l'arête se réduit.
const raised =
  "border-2 border-edge shadow-card active:translate-y-[3px] active:shadow-pressed";

const variantClasses: Record<Variant, string> = {
  primary: `${raised} bg-blue-deep text-cream hover:bg-blue`,
  secondary: `${raised} bg-blue-pale text-blue-deep hover:bg-blue-light/30`,
  yellow: `${raised} bg-yellow-vivid text-ink hover:brightness-95`,
  ghost: "border-2 border-transparent bg-transparent text-ink hover:bg-ink/5",
  danger: `${raised} bg-red-600 text-white hover:bg-red-700`,
};

const sizeClasses: Record<Size, string> = {
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-lg",
};

/**
 * Bouton large et arrondi, pensé pour être touché confortablement
 * d'une seule main sur mobile. Le relief rétro (contour + arête pleine)
 * s'enfonce au clic, comme une vraie touche.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "lg", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "w-full rounded-2xl font-display transition-all duration-150",
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
