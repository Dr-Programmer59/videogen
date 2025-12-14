import { useState } from "react";
import { FormCard } from "@/components/form/FormCard";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { buildT2VPrompt, T2VFormValues } from "@/utils/promptBuilder";
import { generateVideo } from "@/utils/runpodVideoService";
import { RotateCcw, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VALUES: T2VFormValues = {
  prompt: "",
  size: "1280x720",
  frameCount: 21,
  seed: undefined,
};

interface TextToVideoProps {
  onPromptBuilt: (prompt: string, parts: Array<{ label: string; summary: string }>) => void;
  onGenerate: () => void;
}

export default function TextToVideo({ onPromptBuilt, onGenerate }: TextToVideoProps) {
  const [formData, setFormData] = useState<T2VFormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<{ prompt?: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>("");

  const updateField = <K extends keyof T2VFormValues>(field: K, value: T2VFormValues[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'prompt' && errors.prompt) {
      setErrors(prev => ({ ...prev, prompt: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { prompt?: string } = {};
    
    if (!formData.prompt.trim()) newErrors.prompt = "Prompt is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    setFormData(DEFAULT_VALUES);
    setErrors({});
    toast.info("Form reset");
  };

  const handleBuildPrompt = () => {
    if (!validate()) {
      toast.error("Please fix the errors before building prompt");
      return;
    }

    const prompt = buildT2VPrompt(formData);
    
    const parts = [
      { label: "Scene", summary: formData.prompt.slice(0, 60) + "..." },
      { label: "Resolution", summary: formData.size },
      { label: "Length", summary: `${formData.frameCount} frames` },
      formData.seed && { label: "Seed", summary: formData.seed.toString() },
    ].filter(Boolean) as Array<{ label: string; summary: string }>;

    onPromptBuilt(prompt, parts);
    toast.success("Prompt built successfully!");
  };

  const handleGenerate = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before generating");
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);
    setGenerationStatus("Submitting video generation job...");
    
    try {
      const prompt = buildT2VPrompt(formData);
      
      const parts = [
        { label: "Scene", summary: formData.prompt.slice(0, 60) + "..." },
        { label: "Resolution", summary: formData.size },
        { label: "Length", summary: `${formData.frameCount} frames` },
        formData.seed && { label: "Seed", summary: formData.seed.toString() },
      ].filter(Boolean) as Array<{ label: string; summary: string }>;

      onPromptBuilt(prompt, parts);
      toast.info("🎬 Submitting video generation job...");
      
      // Convert size format from "1280x720" to "1280*720"
      const sizeFormatted = formData.size.replace('x', '*');
      
      const videoUrl = await generateVideo(
        formData.prompt,
        (status) => {
          setGenerationStatus(`Status: ${status}`);
          if (status === "IN_QUEUE") {
            toast.info("⏳ Job queued, waiting for processing...");
          } else if (status === "IN_PROGRESS") {
            toast.info("🎬 Creating your cinematic video...");
          }
        },
        sizeFormatted,
        formData.frameCount,
        formData.seed
      );
      
      setGeneratedVideoUrl(videoUrl);
      setGenerationStatus("Completed!");
      onGenerate();
      toast.success("🎉 Video generated successfully!");
      
    } catch (error) {
      console.error('Failed to generate video:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed: ${errorMessage}`);
      setGenerationStatus(`Error: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <FormCard
        title="Text → Cinematic Video"
        description="Generate video from text description with cinematic quality"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={handleReset} className="flex-1" disabled={isGenerating}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="secondary" onClick={handleBuildPrompt} className="flex-1" disabled={isGenerating}>
              <Wand2 className="w-4 h-4 mr-2" />
              Build Prompt
            </Button>
            <Button onClick={handleGenerate} className="flex-1" disabled={isGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <Field 
            label="Video Prompt" 
            required 
            error={errors.prompt} 
            htmlFor="prompt" 
            caption="Describe action, subjects, setting, camera moves"
          >
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => updateField("prompt", e.target.value)}
              placeholder="A cinematic aerial shot slowly descending over a neon-lit cyberpunk city at night. Camera moves through floating holographic billboards and between skyscrapers. Rain creates light trails. Epic and atmospheric."
              rows={5}
              className="bg-secondary border-border resize-none"
            />
          </Field>

          <Field label="Video Size">
            <Select value={formData.size} onValueChange={(v) => updateField("size", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720x1280">720 × 1280 (Vertical/Mobile)</SelectItem>
                <SelectItem value="1280x720">1280 × 720 (Landscape/Standard)</SelectItem>
                <SelectItem value="1024x1024">1024 × 1024 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Frame Count" caption="More frames = longer video">
            <div className="space-y-2">
              <Slider
                value={[formData.frameCount]}
                onValueChange={(v) => updateField("frameCount", v[0])}
                min={12}
                max={48}
                step={1}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">{formData.frameCount} frames</p>
            </div>
          </Field>

          <Field 
            label="Seed (Optional)" 
            htmlFor="seed" 
            caption="Leave blank for random. Use same seed for reproducible results"
          >
            <Input
              id="seed"
              type="number"
              value={formData.seed ?? ""}
              onChange={(e) => updateField("seed", e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Random"
              className="bg-secondary border-border"
            />
          </Field>
        </div>
      </FormCard>

      {/* Generated Video Display */}
      {(isGenerating || generatedVideoUrl) && (
        <FormCard
          title="Generated Cinematic Video"
          description={generationStatus || "Your AI-generated cinematic video"}
        >
          <div className="space-y-4">
            {isGenerating && !generatedVideoUrl && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">{generationStatus}</p>
                <p className="text-xs text-muted-foreground">Video generation may take 2-5 minutes...</p>
              </div>
            )}
            
            {generatedVideoUrl && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                  <video 
                    src={generatedVideoUrl} 
                    controls
                    autoPlay
                    loop
                    className="w-full h-auto"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(generatedVideoUrl, '_blank');
                    }}
                  >
                    Open in New Tab
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => setGeneratedVideoUrl(null)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </FormCard>
      )}
    </div>
  );
}
