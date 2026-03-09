import React from "react";

export const Badge = ({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  className?: string;
}) => {
  const variants: Record<string, string> = {
    default: "bg-gray-100 text-gray-800 border-transparent",
    secondary: "bg-blue-100 text-blue-800 border-transparent",
    destructive: "bg-red-100 text-red-800 border-transparent",
    outline: "border-gray-200 text-gray-700",
    success: "bg-green-100 text-green-800 border-transparent",
    warning: "bg-amber-100 text-amber-800 border-transparent",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </div>
  );
};
