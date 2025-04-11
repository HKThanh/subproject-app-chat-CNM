import { SVGProps } from "react";

export const RightBar = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M15 4H5.5C4.67157 4 4 4.67157 4 5.5V18.5C4 19.3284 4.67157 20 5.5 20H15V4Z
         M16 4V20H18.5C19.3284 20 20 19.3284 20 18.5V5.5C20 4.67157 19.3284 4 18.5 4H16Z
         M3 5.5C3 4.11929 4.11929 3 5.5 3H18.5C19.8807 3 21 4.11929 21 5.5V18.5C21 19.8807 19.8807 21 18.5 21H5.5C4.11929 21 3 19.8807 3 18.5V5.5Z"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
