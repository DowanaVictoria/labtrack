import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const sizes = {
  default: "px-5 py-3",
  sm: "px-3.5 py-1.5 text-[12.5px]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:hover:bg-brand",
  secondary: "bg-surface text-brand border-[1.5px] border-brand hover:bg-brand-tint",
  danger: "bg-surface text-danger border-[1.5px] border-danger hover:bg-danger-tint",
  ghost: "bg-surface text-ink-soft border border-border hover:bg-background",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: keyof typeof sizes = "default", className = "") {
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
