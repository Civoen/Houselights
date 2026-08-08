"use client";
import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  glow?: boolean;
}

export function GradientButton({ className = "", glow = false, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={
        "w-full bg-grad text-white border-none py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 " +
        "transition-all duration-150 ease-out hover:brightness-[1.05] active:scale-[0.97] active:brightness-95 " +
        "disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100 " +
        (glow && !disabled ? "animate-soft-glow " : "") +
        className
      }
    />
  );
}
