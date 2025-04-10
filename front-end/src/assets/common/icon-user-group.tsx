import * as React from "react";
import { SVGProps } from "react";

const GroupAddIcon = ({
  color = "#000000",
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    width={width}
    height={height}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx={8} cy={8} r={2.5} stroke={color} strokeWidth={1.5} />
    <path
      d="M12 8.5C12.2 8.1 12.6 7.8 13 7.7C13.4 7.6 13.8 7.6 14.2 7.8C14.6 8 14.9 8.4 15 8.8C15.1 9.2 15.1 9.6 14.9 10C14.7 10.4 14.4 10.7 14 10.9C13.6 11.1 13.2 11.1 12.8 10.9C12.4 10.7 12.1 10.3 12 9.9C11.9 9.5 11.9 9.1 12 8.5Z"
      stroke={color}
      strokeWidth={1.5}
    />
    <path
      d="M3.5 18C3.7 16.8 4.2 15.5 5.1 14.5C6 13.5 7.4 13 8.9 13C10.4 13 11.8 13.5 12.7 14.5C13.6 15.5 14.1 16.8 14.3 18"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <path
      d="M13.5 14C14.5 14 15.3 14.5 15.8 15.2C16.3 15.9 16.6 16.8 16.8 17.5C17 18.2 16.6 19 16 19H12.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <path
      d="M18.5 5.25H21.5M20 3V7.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

export default GroupAddIcon;
