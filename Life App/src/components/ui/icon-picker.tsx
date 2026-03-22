import { cn } from "@/lib/utils";
import { LucideIcon } from "@/components/ui/lucide-icon";
import type { IconDef } from "@/lib/icons";

interface IconPickerProps {
  icons: IconDef[];
  value: string;
  onChange: (name: string) => void;
  className?: string;
}

/**
 * Reusable icon picker grid. Displays a curated set of Lucide icons as
 * selectable buttons. Used in the category creation form and the activity
 * type form.
 */
export function IconPicker({ icons, value, onChange, className }: IconPickerProps) {
  return (
    <div className={cn("grid grid-cols-6 gap-1", className)}>
      {icons.map((icon) => (
        <button
          key={icon.name}
          type="button"
          title={icon.label}
          onClick={() => onChange(icon.name)}
          className={cn(
            "flex items-center justify-center rounded-md p-1.5 transition-colors",
            value === icon.name
              ? "bg-primary/10 ring-2 ring-primary"
              : "hover:bg-muted"
          )}
        >
          <LucideIcon name={icon.name} size="sm" className="bg-transparent" />
        </button>
      ))}
    </div>
  );
}
