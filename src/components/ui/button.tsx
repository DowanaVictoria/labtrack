import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-all " +
  "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const sizes = {
  default: "px-5 py-3",
  sm: "px-3.5 py-1.5 text-[12.5px]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm shadow-brand/20 hover:-translate-y-0.5 hover:bg-brand-dark disabled:hover:bg-brand",
  secondary: "border border-border bg-surface text-brand-dark shadow-sm hover:-translate-y-0.5 hover:border-brand hover:bg-brand-tint",
  danger: "border border-danger bg-surface text-danger shadow-sm hover:bg-danger-tint",
  ghost: "border border-transparent bg-transparent text-ink-soft hover:border-border hover:bg-surface hover:text-foreground",
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
