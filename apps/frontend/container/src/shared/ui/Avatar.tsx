import React from "react";

export const Avatar = ({ initials }: { initials: string }) => (
  <div className="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
    {initials}
  </div>
);
