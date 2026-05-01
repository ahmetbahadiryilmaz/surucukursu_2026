import { HTMLDivElementProps } from "@/shared/types";

const Large = ({ children, className, ...props }: HTMLDivElementProps) => {
  return (
    <div className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Large;
