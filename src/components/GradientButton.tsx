"use client";
import { ButtonHTMLAttributes } from "react";

export function GradientButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "w-full bg-grad text-white border-none py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50 " +
        className
      }
    />
  );
}
