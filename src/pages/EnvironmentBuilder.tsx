import { useState } from "react";
import { FormCard } from "@/components/form/FormCard";
import { Field } from "@/components/form/Field";
import { TagInput } from "@/components/form/TagInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { buildEnvironmentPrompt, EnvironmentFormValues } from "@/utils/promptBuilder";
import { enhanceEnvironmentPrompt } from "@/utils/openaiService";
import { generateImage } from "@/utils/runpodService";
import { LANDSCAPE_SIZES, DEFAULT_LANDSCAPE_SIZE, getSizeByLabel } from "@/utils/imageSizes";
import { RotateCcw, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VALUES: EnvironmentFormValues = {
  location: "",
  timeOfDay: "golden hour",
  weather: "clear",
  season: "summer",
  mood: "",
  era: "",
  subjectFocus: "",
  camera: "24mm wide",
  lighting: "",
  colorPalette: [],
  foregroundElements: [],
  midgroundElements: [],
  backgroundElements: [],
  realism: "photorealistic",
  styleLineage: [],
  quality: "standard",
  styleHints: [],
  negativePrompts: [],
  extraNotes: "",
};

interface EnvironmentBuilderProps {
  onPromptBuilt: (prompt: string, parts: Array<{ label: string; summary: string }>) => void;
  onGenerate: (imageUrl: string) => void;
  savedImageUrl?: string;
}

export default function EnvironmentBuilder({ onPromptBuilt, onGenerate, savedImageUrl }: EnvironmentBuilderProps) {
  const [formData, setFormData] = useState<EnvironmentFormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof EnvironmentFormValues, string>>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(savedImageUrl || null);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [selectedImageSize, setSelectedImageSize] = useState<string>(DEFAULT_LANDSCAPE_SIZE);

  const updateField = <K extends keyof EnvironmentFormValues>(field: K, value: EnvironmentFormValues[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof EnvironmentFormValues, string>> = {};
    
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.timeOfDay && !formData.lighting) {
      newErrors.timeOfDay = "Either time of day or lighting is required";
      newErrors.lighting = "Either time of day or lighting is required";
    }
    if (
      formData.foregroundElements.length === 0 &&
      formData.midgroundElements.length === 0 &&
      formData.backgroundElements.length === 0
    ) {
      const msg = "At least one element layer is required";
      newErrors.foregroundElements = msg;
      newErrors.midgroundElements = msg;
      newErrors.backgroundElements = msg;
    }

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

    const prompt = buildEnvironmentPrompt(formData);
    
    const parts = [
      { label: "Location", summary: `${formData.location} - ${formData.timeOfDay}` },
      formData.weather !== "clear" && { label: "Weather", summary: formData.weather },
      formData.foregroundElements.length > 0 && { label: "Foreground", summary: formData.foregroundElements.join(", ") },
      formData.midgroundElements.length > 0 && { label: "Midground", summary: formData.midgroundElements.join(", ") },
      formData.backgroundElements.length > 0 && { label: "Background", summary: formData.backgroundElements.join(", ") },
      { label: "Camera", summary: formData.camera },
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
    setGeneratedImageUrl(null);
    setGenerationStatus("Enhancing prompt with AI...");
    
    try {
      // Step 1: Enhance prompt using OpenAI
      toast.info("Enhancing environment prompt with AI...");
      const enhancedPrompt = await enhanceEnvironmentPrompt(formData);
      
      // Create parts summary for preview panel
      const parts = [
        { label: "Location", summary: `${formData.location} - ${formData.timeOfDay}` },
        formData.weather !== "clear" && { label: "Weather", summary: formData.weather },
        formData.foregroundElements.length > 0 && { label: "Foreground", summary: formData.foregroundElements.join(", ") },
        formData.midgroundElements.length > 0 && { label: "Midground", summary: formData.midgroundElements.join(", ") },
        formData.backgroundElements.length > 0 && { label: "Background", summary: formData.backgroundElements.join(", ") },
        { label: "Camera", summary: formData.camera },
      ].filter(Boolean) as Array<{ label: string; summary: string }>;

      onPromptBuilt(enhancedPrompt, parts);
      toast.success("✅ Environment prompt enhanced successfully!");
      
      // Step 2: Generate image using RunPod with selected size
      setGenerationStatus("Generating environment image...");
      toast.info("🎨 Generating environment image...");
      
      const sizeConfig = getSizeByLabel(LANDSCAPE_SIZES, selectedImageSize);
      const width = sizeConfig?.width || 1920;
      const height = sizeConfig?.height || 1080;
      
      const imageUrl = await generateImage(
        enhancedPrompt,
        (status) => {
          setGenerationStatus(`Status: ${status}`);
          if (status === "IN_QUEUE") {
            toast.info("⏳ Job queued, waiting for processing...");
          } else if (status === "IN_PROGRESS") {
            toast.info("🎨 Creating your environment...");
          }
        },
        width,
        height
      );
      
      console.log('✅ Environment image generated successfully!');
      console.log('📸 Base64 image length:', imageUrl.length);
      console.log('🔗 Image preview:', imageUrl.substring(0, 100) + '...');
      
      setGeneratedImageUrl(imageUrl);
      setGenerationStatus("Completed!");
      onGenerate(imageUrl);
      toast.success("🎉 Environment image generated successfully!");
      
    } catch (error) {
      console.error('Failed to generate environment:', error);
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
        title="Environment Builder"
        description="Create immersive environment descriptions with detailed scene composition"
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
        {/* A) Scene Basics */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Scene Basics</h3>
          
          <Field label="Location" required error={errors.location} htmlFor="location" caption="e.g., dense cedar forest, cyberpunk alley">
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="misty cedar forest"
              className="bg-secondary border-border"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Time of Day" error={errors.timeOfDay}>
              <Select value={formData.timeOfDay} onValueChange={(v) => updateField("timeOfDay", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dawn">Dawn</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="noon">Noon</SelectItem>
                  <SelectItem value="golden hour">Golden Hour</SelectItem>
                  <SelectItem value="blue hour">Blue Hour</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Weather">
              <Select value={formData.weather} onValueChange={(v) => updateField("weather", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clear">Clear</SelectItem>
                  <SelectItem value="overcast">Overcast</SelectItem>
                  <SelectItem value="rain">Rain</SelectItem>
                  <SelectItem value="snow">Snow</SelectItem>
                  <SelectItem value="fog">Fog</SelectItem>
                  <SelectItem value="storm">Storm</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Season">
              <Select value={formData.season} onValueChange={(v) => updateField("season", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="autumn">Autumn</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Mood" htmlFor="mood" caption="e.g., cozy, ominous, epic, serene">
              <Input
                id="mood"
                value={formData.mood}
                onChange={(e) => updateField("mood", e.target.value)}
                placeholder="serene"
                className="bg-secondary border-border"
              />
            </Field>
          </div>

          <Field label="Era" htmlFor="era" caption="e.g., Victorian, 2080, medieval">
            <Input
              id="era"
              value={formData.era}
              onChange={(e) => updateField("era", e.target.value)}
              placeholder="2080"
              className="bg-secondary border-border"
            />
          </Field>
        </div>

        {/* B) Composition */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Composition</h3>
          
          <Field label="Subject Focus" htmlFor="subjectFocus" caption="Main focal point (e.g., ancient gate, market square)">
            <Input
              id="subjectFocus"
              value={formData.subjectFocus}
              onChange={(e) => updateField("subjectFocus", e.target.value)}
              placeholder="ancient gate"
              className="bg-secondary border-border"
            />
          </Field>

          <Field label="Camera" tooltip="Lens presets affect composition and perspective">
            <Select value={formData.camera} onValueChange={(v) => updateField("camera", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24mm wide">24mm Wide</SelectItem>
                <SelectItem value="drone aerial">Drone Aerial</SelectItem>
                <SelectItem value="isometric">Isometric</SelectItem>
                <SelectItem value="telephoto">Telephoto</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Lighting" error={errors.lighting} htmlFor="lighting" tooltip="Describe light quality/direction" caption="e.g., volumetric sun rays, neon rim light">
            <Input
              id="lighting"
              value={formData.lighting}
              onChange={(e) => updateField("lighting", e.target.value)}
              placeholder="volumetric sun rays"
              className="bg-secondary border-border"
            />
          </Field>

          <Field label="Color Palette" caption="Color names or hex codes (press Enter or comma)">
            <TagInput
              value={formData.colorPalette}
              onChange={(v) => updateField("colorPalette", v)}
              placeholder="teal, amber, #ff6b6b..."
            />
          </Field>

          <Field label="Foreground Elements" error={errors.foregroundElements} caption="Elements closest to camera (press Enter or comma)">
            <TagInput
              value={formData.foregroundElements}
              onChange={(v) => updateField("foregroundElements", v)}
              placeholder="mossy stones, fallen logs..."
            />
          </Field>

          <Field label="Midground Elements" error={errors.midgroundElements} caption="Elements in the middle distance">
            <TagInput
              value={formData.midgroundElements}
              onChange={(v) => updateField("midgroundElements", v)}
              placeholder="shallow creek, stone path..."
            />
          </Field>

          <Field label="Background Elements" error={errors.backgroundElements} caption="Elements in the distance">
            <TagInput
              value={formData.backgroundElements}
              onChange={(v) => updateField("backgroundElements", v)}
              placeholder="mountains, clouds..."
            />
          </Field>
        </div>

        {/* C) Realism & Style */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Realism & Style</h3>
          
          <Field label="Realism">
            <RadioGroup value={formData.realism} onValueChange={(v) => updateField("realism", v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="photorealistic" id="realism-photo" />
                <Label htmlFor="realism-photo">Photorealistic</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stylized" id="realism-stylized" />
                <Label htmlFor="realism-stylized">Stylized</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="illustrative" id="realism-illustrative" />
                <Label htmlFor="realism-illustrative">Illustrative</Label>
              </div>
            </RadioGroup>
          </Field>

          <Field label="Style Lineage" caption="Artistic influences (e.g., ghibli, film noir, unreal engine)">
            <TagInput
              value={formData.styleLineage}
              onChange={(v) => updateField("styleLineage", v)}
              placeholder="ghibli, unreal engine..."
            />
          </Field>
        </div>

        {/* D) Global Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Global Controls</h3>
          
          <Field label="Image Size" tooltip="Select the output image dimensions">
            <Select value={selectedImageSize} onValueChange={setSelectedImageSize}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANDSCAPE_SIZES.map((size) => (
                  <SelectItem key={size.label} value={size.label}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getSizeByLabel(LANDSCAPE_SIZES, selectedImageSize)?.description}
            </p>
          </Field>
          
          <Field label="Quality">
            <RadioGroup value={formData.quality} onValueChange={(v) => updateField("quality", v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="draft" id="quality-draft" />
                <Label htmlFor="quality-draft">Draft</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="quality-standard" />
                <Label htmlFor="quality-standard">Standard</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="quality-high" />
                <Label htmlFor="quality-high">High</Label>
              </div>
            </RadioGroup>
          </Field>

          <Field label="Style Hints" caption="High-level aesthetic descriptors">
            <TagInput
              value={formData.styleHints}
              onChange={(v) => updateField("styleHints", v)}
              placeholder="atmospheric, dreamy..."
            />
          </Field>

          <Field label="Negative Prompts" caption="Things to avoid in the scene">
            <TagInput
              value={formData.negativePrompts}
              onChange={(v) => updateField("negativePrompts", v)}
              placeholder="no humans, no modern elements..."
            />
          </Field>

          <Field label="Extra Notes" htmlFor="extraNotes" caption="Any additional custom instructions">
            <Textarea
              id="extraNotes"
              value={formData.extraNotes}
              onChange={(e) => updateField("extraNotes", e.target.value)}
              placeholder="Add any extra notes here..."
              rows={3}
              className="bg-secondary border-border resize-none"
            />
          </Field>
        </div>
      </FormCard>

      {/* Generated Image Display */}
      {(isGenerating || generatedImageUrl) && (
        <FormCard
          title="Generated Environment Image"
          description={generationStatus || "Your AI-generated environment image"}
        >
          <div className="space-y-4">
            {isGenerating && !generatedImageUrl && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">{generationStatus}</p>
              </div>
            )}
            
            {generatedImageUrl && (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={generatedImageUrl} 
                    alt="Generated environment" 
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedImageUrl;
                      link.download = 'environment-image.png';
                      link.click();
                    }}
                  >
                    Download Image
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => setGeneratedImageUrl(null)}
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
