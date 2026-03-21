import { cn } from "@/lib/utils";
import { getLucideIcon } from "@/lib/icons";

interface LucideIconProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const wrapperSizeClasses = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Renders a Lucide icon by kebab-case name string.
 * Falls back to rendering the raw string (e.g. a legacy emoji) if the name
 * is not found in the icon registry — no crashes, no broken layouts.
 *
 * Drop-in visual replacement for EmojiIcon: identical wrapper sizing and
 * background treatment.
 */
export function LucideIcon({ name, size = "md", className }: LucideIconProps) {
  const Icon = getLucideIcon(name);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-muted/50",
        wrapperSizeClasses[size],
        className
      )}
    >
      {Icon ? (
        <Icon className={iconSizeClasses[size]} />
      ) : (
        <span role="img" className="text-sm leading-none">
          {name}
        </span>
      )}
    </span>
  );
}
