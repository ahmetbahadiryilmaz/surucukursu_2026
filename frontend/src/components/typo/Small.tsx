import { HTMLElementProps } from "@/shared/types";

const Small = ({ children, className, ...props }: HTMLElementProps) => {
  return (
    <small
      className={`text-sm font-medium leading-none ${className}`}
      {...props}
    >
      {children}
    </small>
  );
};

export default Small;
