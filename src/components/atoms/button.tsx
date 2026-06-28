import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const VARIANT: Record<Variant, string> = {
  primary: "bg-info text-info-on",
  secondary: "border-[1.5px] border-hairline bg-canvas text-ink",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Primary/secondary action button. 48px min height for crisis-grade touch
 * targets (DESIGN.md). No hooks, so it works in server or client trees.
 */
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-button disabled:bg-surface-sunk disabled:text-ink-muted ${VARIANT[variant]} ${className}`}
      {...rest}
    />
  );
}
