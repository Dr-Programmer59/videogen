import { ReactNode } from "react";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface FieldProps {
  label: string;
  caption?: string;
  error?: string;
  required?: boolean;
  tooltip?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, caption, error, required, tooltip, children, htmlFor }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor} className={cn("text-sm font-medium", required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
