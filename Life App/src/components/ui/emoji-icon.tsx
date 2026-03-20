import { cn } from "@/lib/utils";

interface EmojiIconProps {
  emoji: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-6 text-sm",
  md: "size-8 text-base",
  lg: "size-10 text-xl",
};

export function EmojiIcon({ emoji, size = "md", className }: EmojiIconProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-muted/50",
        sizeClasses[size],
        className
      )}
      role="img"
    >
      {emoji}
    </span>
  );
}
