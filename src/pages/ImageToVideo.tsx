import { useState } from "react";
import { FormCard } from "@/components/form/FormCard";
import { Field } from "@/components/form/Field";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { buildI2VPrompt, I2VFormValues } from "@/utils/promptBuilder";
import { generateImageToVideo } from "@/utils/runpodI2VService";
import { RotateCcw, Wand2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VALUES: I2VFormValues = {
  prompt: "",
  frameCount: 21,
  samplingSteps: 6,
};

interface ImageToVideoProps {
  onPromptBuilt: (prompt: string, parts: Array<{ label: string; summary: string }>) => void;
  onGenerate: () => void;
}

export default function ImageToVideo({ onPromptBuilt, onGenerate }: ImageToVideoProps) {
  const [formData, setFormData] = useState<I2VFormValues>(DEFAULT_VALUES);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [errors, setErrors] = useState<{ prompt?: string; image?: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>("");

  const updateField = <K extends keyof I2VFormValues>(field: K, value: I2VFormValues[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'prompt' && errors.prompt) {
      setErrors(prev => ({ ...prev, prompt: undefined }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        toast.error("Please select a PNG or JPG image");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: undefined }));
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: { prompt?: string; image?: string } = {};
    
    if (!imageFile) newErrors.image = "Image is required";
    if (!formData.prompt.trim()) newErrors.prompt = "Prompt is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    setFormData(DEFAULT_VALUES);
    setImageFile(null);
    setImagePreview("");
    setErrors({});
    toast.info("Form reset");
  };

  const handleBuildPrompt = () => {
    if (!validate()) {
      toast.error("Please fix the errors before building prompt");
      return;
    }

    const prompt = buildI2VPrompt(formData);
    
    const parts = [
      { label: "Image", summary: imageFile?.name || "Selected" },
      { label: "Motion", summary: formData.prompt.slice(0, 50) + "..." },
      { label: "Settings", summary: `${formData.frameCount} frames, ${formData.samplingSteps} steps` },
    ];

    onPromptBuilt(prompt, parts);
    toast.success("Prompt built successfully!");
  };

  const handleGenerate = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before generating");
      return;
    }

    if (!imageFile) {
      toast.error("Please select an image first");
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);
    setGenerationStatus("Submitting image-to-video job...");
    
    try {
      const prompt = buildI2VPrompt(formData);
      
      const parts = [
        { label: "Image", summary: imageFile.name },
        { label: "Motion", summary: formData.prompt.slice(0, 50) + "..." },
        { label: "Settings", summary: `${formData.frameCount} frames, ${formData.samplingSteps} steps` },
      ];

      onPromptBuilt(prompt, parts);
      toast.info("🎬 Submitting image-to-video job...");
      
      const videoUrl = await generateImageToVideo(
        imageFile,
        formData.prompt,
        (status) => {
          setGenerationStatus(`Status: ${status}`);
          if (status === "IN_QUEUE") {
            toast.info("⏳ Job queued, waiting for processing...");
          } else if (status === "IN_PROGRESS") {
            toast.info("🎬 Animating your image...");
          }
        },
        formData.frameCount,
        formData.samplingSteps
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
        title="Image → Video"
        description="Animate a static image with AI-generated motion"
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
          <Field label="Source Image" required error={errors.image} caption="Upload a PNG or JPG image to animate">
            <div className="space-y-4">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-2xl cursor-pointer bg-secondary/50 hover:bg-secondary transition-colors"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground">.png, .jpg (max 20MB)</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              {imageFile && (
                <p className="text-xs text-muted-foreground text-center">{imageFile.name}</p>
              )}
            </div>
          </Field>

          <Field label="Motion Prompt" required error={errors.prompt} htmlFor="prompt" caption="Describe the desired animation and motion">
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => updateField("prompt", e.target.value)}
              placeholder="Camera slowly zooms in while light particles drift upward, gentle wind effect on hair and clothing..."
              rows={4}
              className="bg-secondary border-border resize-none"
            />
          </Field>

          <Field label="Frame Count" caption="More frames = longer, smoother video">
            <div className="space-y-2">
              <Slider
                value={[formData.frameCount]}
                onValueChange={(v) => updateField("frameCount", v[0])}
                min={8}
                max={48}
                step={1}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">{formData.frameCount} frames</p>
            </div>
          </Field>

          <Field label="Sampling Steps" caption="Higher steps = better quality but slower">
            <div className="space-y-2">
              <Slider
                value={[formData.samplingSteps]}
                onValueChange={(v) => updateField("samplingSteps", v[0])}
                min={4}
                max={8}
                step={1}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">{formData.samplingSteps} steps</p>
            </div>
          </Field>
        </div>
      </FormCard>

      {/* Generated Video Display */}
      {(isGenerating || generatedVideoUrl) && (
        <FormCard
          title="Generated Animated Video"
          description={generationStatus || "Your AI-generated animated video"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Image */}
                  <div>
                    <p className="text-sm font-medium mb-2">Original Image</p>
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img 
                        src={imagePreview} 
                        alt="Original image" 
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  
                  {/* Generated Video */}
                  <div>
                    <p className="text-sm font-medium mb-2">Animated Video</p>
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
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(generatedVideoUrl, '_blank');
                    }}
                  >
                    Open Video in New Tab
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
