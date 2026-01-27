import { cn } from "@/lib/utils";
import { styles } from "@/styles";

export interface InputProps {
  type?: string;
  className?: string;
  [key: string]: any;
}

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      class={cn(styles.ui.input.base, className)}
      {...props}
    />
  );
}
