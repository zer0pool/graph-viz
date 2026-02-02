import { SVGProps } from "react";

export function UpstreamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Arrow pointing down into table */}
      <path
        d="M12 2V10M12 10L9 7M12 10L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Table */}
      <rect
        x="4"
        y="12"
        width="16"
        height="10"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="4"
        y1="16"
        x2="20"
        y2="16"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
