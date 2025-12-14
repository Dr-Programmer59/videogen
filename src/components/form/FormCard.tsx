import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

interface FormCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function FormCard({ title, description, children, footer }: FormCardProps) {
  return (
    <Card className="shadow-soft border-border bg-gradient-to-br from-card to-card/80">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
      {footer && <CardFooter className="border-t border-border pt-6">{footer}</CardFooter>}
    </Card>
  );
}
