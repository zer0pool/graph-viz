import React from "react";
import { getAvatarColor } from "../lib/utils";

interface AvatarProps {
  initials: string;
  name?: string; // Used for consistent color hashing
}

export const Avatar = ({ initials, name }: AvatarProps) => {
  const colors = getAvatarColor(name);

  return (
    <div
      className={`h-20 w-20 rounded-2xl ${colors.bg} flex items-center justify-center text-white text-2xl font-bold shadow-inner transition-colors ${colors.text}`}
    >
      {initials}
    </div>
  );
};
