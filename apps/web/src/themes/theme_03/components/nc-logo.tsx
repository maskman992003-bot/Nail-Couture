import { cn } from "@/lib/utils"

export function NCLogo({
  className,
  withText = true,
  textClassName,
}: {
  className?: string
  withText?: boolean
  textClassName?: string
}) {
  return (
    <div className={cn("flex flex-col items-center leading-none", className)}>
      <span
        className="font-heading font-medium tracking-tight text-primary"
        style={{ fontSize: "1.9em" }}
        aria-hidden="true"
      >
        NC
      </span>
      {withText && (
        <span
          className={cn(
            "font-heading uppercase tracking-[0.35em] text-primary",
            textClassName,
          )}
          style={{ fontSize: "0.62em" }}
        >
          Nail Couture
        </span>
      )}
    </div>
  )
}
