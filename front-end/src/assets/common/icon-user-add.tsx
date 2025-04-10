import * as React from "react";
import { SVGProps } from "react";

const UserAddIcon = ({
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
    <path
      d="M12 12.75C8.83 12.75 6.25 10.17 6.25 7C6.25 3.83 8.83 1.25 12 1.25C15.17 1.25 17.75 3.83 17.75 7C17.75 10.17 15.17 12.75 12 12.75Z"
      stroke={color}
      strokeWidth={1.5}
    />
    <path
      d="M3.41 22.75C3 22.75 2.66 22.41 2.66 22C2.66 17.73 6.85 14.25 12 14.25C13.01 14.25 14 14.38 14.96 14.65"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <path
      d="M18 22.75C15.93 22.75 14.25 21.07 14.25 19C14.25 16.93 15.93 15.25 18 15.25C20.07 15.25 21.75 16.93 21.75 19C21.75 21.07 20.07 22.75 18 22.75Z"
      stroke={color}
      strokeWidth={1.5}
    />
    <path
      d="M16.5 19H19.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <path
      d="M18 17V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

export default UserAddIcon;
