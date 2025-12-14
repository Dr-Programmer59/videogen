import { Copy, X } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PromptPart {
  label: string;
  summary: string;
}

interface PreviewPanelProps {
  promptText: string;
  promptParts: PromptPart[];
  resultType: "image" | "video" | null;
  resultPlaceholder?: string;
  status: "ready" | "building" | "generated";
  onClear: () => void;
}

export function PreviewPanel({
  promptText,
  promptParts,
  resultType,
  resultPlaceholder,
  status,
  onClear,
}: PreviewPanelProps) {
  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    toast.success("Prompt copied to clipboard");
  };

  const copyAsJson = () => {
    const jsonData = {
      prompt: promptText,
      parts: promptParts,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    toast.success("JSON copied to clipboard");
  };

  const statusColors = {
    ready: "text-muted-foreground",
    building: "text-primary",
    generated: "text-green-500",
  };

  const statusLabels = {
    ready: "Ready",
    building: "Building prompt...",
    generated: "Generated (mock)",
  };

  return (
    <div className="w-[400px] bg-card border-l border-border flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Preview</h2>
        <p className={cn("text-sm mt-1", statusColors[status])}>
          {statusLabels[status]}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Prompt Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Prompt Output</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={copyAsJson}
                className="h-7 px-2"
                disabled={!promptText}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                className="h-7 px-2"
                disabled={!promptText}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <Textarea
            value={promptText}
            readOnly
            placeholder="Your prompt will appear here..."
            className="min-h-[120px] font-mono text-xs resize-none bg-secondary border-border"
          />

          <Button
            size="sm"
            variant="outline"
            onClick={copyPrompt}
            disabled={!promptText}
            className="w-full"
          >
            <Copy className="w-3 h-3 mr-2" />
            Copy Prompt
          </Button>
        </div>

        {/* Prompt Parts */}
        {promptParts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Prompt Parts</h3>
            <div className="flex flex-wrap gap-2">
              {promptParts.map((part, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                  title={part.summary}
                >
                  {part.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Result Placeholder */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Result</h3>
          
          {resultType === "image" && (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center relative overflow-hidden">
              {resultPlaceholder ? (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center">
                  <p className="text-sm font-medium text-foreground/80">Sample Image Generated</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No image yet</p>
              )}
            </div>
          )}

          {resultType === "video" && (
            <div className="aspect-video rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center relative overflow-hidden">
              {resultPlaceholder ? (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-background/80 flex items-center justify-center mx-auto">
                      <div className="w-0 h-0 border-l-[12px] border-l-foreground border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
                    </div>
                    <p className="text-sm font-medium text-foreground/80">Sample Video Generated</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No video yet</p>
              )}
            </div>
          )}

          {!resultType && (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Build a prompt to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
