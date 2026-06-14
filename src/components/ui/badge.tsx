import { cn } from "@/lib/utils";
import { badgeStyles, type BadgeVariant } from "@/lib/theme";

export function Badge({ children, variant = "default", className }: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", badgeStyles[variant], className)}>
      {children}
    </span>
  );
}

export { statusVariant } from "@/lib/theme";
