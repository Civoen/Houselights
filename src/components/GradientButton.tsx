"use client";
import { ButtonHTMLAttributes } from "react";

export function GradientButton({ className = "", disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={
        "w-full bg-grad text-white border-none py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 " +
        "transition-all duration-150 ease-out hover:brightness-[1.05] hover:scale-[1.02] active:scale-[0.97] active:brightness-95 " +
        "disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:scale-100 disabled:active:scale-100 " +
        className
      }
    />
  );
}
