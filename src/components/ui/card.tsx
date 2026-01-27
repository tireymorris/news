import { cn } from "@/lib/utils";
import { styles } from "@/styles";

export interface CardProps {
  className?: string;
  children?: any;
  [key: string]: any;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      class={cn(styles.ui.card.base, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div class={cn(styles.ui.card.header, className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: CardProps) {
  return (
    <h3
      class={cn(styles.ui.card.title, className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: CardProps) {
  return (
    <p class={cn(styles.ui.card.description, className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div class={cn(styles.ui.card.content, className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div class={cn(styles.ui.card.footer, className)} {...props}>
      {children}
    </div>
  );
}
