import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  outline: "border border-gray-300 text-gray-700 bg-transparent",
};

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: "success",
    CONFIRMED: "success",
    APPROVED: "success",
    PAID: "success",
    COMPLETED: "success",
    PENDING: "warning",
    SUBMITTED: "warning",
    DRAFT: "warning",
    IN_PROGRESS: "info",
    INVITED: "info",
    PROCESSING: "info",
    REJECTED: "danger",
    FLAGGED: "danger",
    CANCELLED: "danger",
    INACTIVE: "outline",
    DECLINED: "outline",
    FAILED: "danger",
    SKIPPED: "outline",
    CREATED: "success",
    UPDATED: "info",
    ERROR: "danger",
  };
  return map[status] ?? "default";
}
