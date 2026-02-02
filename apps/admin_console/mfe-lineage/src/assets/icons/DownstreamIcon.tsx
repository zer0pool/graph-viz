import { SVGProps } from "react";

export function DownstreamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Table */}
      <rect
        x="4"
        y="2"
        width="16"
        height="10"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Arrow pointing down from table */}
      <path
        d="M12 14V22M12 22L9 19M12 22L15 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
