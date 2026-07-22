import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "cream" | "blue" | "yellow";
}

const toneClasses = {
  cream: "bg-white",
  blue: "bg-blue-pale",
  yellow: "bg-yellow-pale",
};

/** Grande carte arrondie, brique de base de toute l'interface. */
export function Card({ className, tone = "cream", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl2 p-5 shadow-card",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
