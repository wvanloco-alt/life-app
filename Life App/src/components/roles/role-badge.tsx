import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  name: string;
  color: string;
  className?: string;
}

export function RoleBadge({ name, color, className }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}33`,
      }}
    >
      <span
        className="mr-1.5 inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </Badge>
  );
}
