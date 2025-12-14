import { useState } from "react";
import { FormCard } from "@/components/form/FormCard";
import { Field } from "@/components/form/Field";
import { TagInput } from "@/components/form/TagInput";
import { ColorInput } from "@/components/form/ColorInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { buildCharacterPrompt, CharacterFormValues } from "@/utils/promptBuilder";
import { enhanceCharacterPrompt } from "@/utils/openaiService";
import { generateImage } from "@/utils/runpodService";
import { PORTRAIT_SIZES, DEFAULT_PORTRAIT_SIZE, getSizeByLabel } from "@/utils/imageSizes";
import { RotateCcw, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VALUES: CharacterFormValues = {
  gender: "unspecified",
  age: 28,
  ethnicity: "",
  eyeColor: "brown",
  eyeShape: "almond",
  eyebrowShape: "soft arch",
  noseShape: "straight",
  lips: "medium",
  teeth: "not visible",
  facialHair: "none",
  skinColor: "#c58c5a",
  undertone: "neutral",
  freckles: false,
  makeup: 1,
  expression: "",
  hairstyle: "",
  hairColor: "#3b2e2e",
  hairLength: "medium",
  accessories: [],
  height: 170,
  bodyType: "average",
  shoulders: "average",
  chest: "average",
  waist: "average",
  hips: "average",
  outfitStyle: "",
  outfitColors: [],
  footwear: "",
  pose: "",
  camera: "85mm portrait",
  framing: "medium",
  lighting: "",
  background: "",
  quality: "standard",
  styleHints: [],
  negativePrompts: [],
  extraNotes: "",
};

interface CharacterBuilderProps {
  onPromptBuilt: (prompt: string, parts: Array<{ label: string; summary: string }>) => void;
  onGenerate: (imageUrl: string) => void;
  savedImageUrl?: string;
}

export default function CharacterBuilder({ onPromptBuilt, onGenerate, savedImageUrl }: CharacterBuilderProps) {
  const [formData, setFormData] = useState<CharacterFormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof CharacterFormValues, string>>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(savedImageUrl || null);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [selectedImageSize, setSelectedImageSize] = useState<string>(DEFAULT_PORTRAIT_SIZE);

  const updateField = <K extends keyof CharacterFormValues>(field: K, value: CharacterFormValues[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CharacterFormValues, string>> = {};
    
    if (!formData.eyeColor) newErrors.eyeColor = "Eye color is required";
    if (!formData.skinColor || formData.skinColor === "") newErrors.skinColor = "Skin color is required";
    if (formData.age < 1 || formData.age > 100) newErrors.age = "Age must be between 1-100";
    if (!formData.hairstyle && !formData.outfitStyle) {
      newErrors.hairstyle = "Either hair or outfit style is required";
      newErrors.outfitStyle = "Either hair or outfit style is required";
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

    const prompt = buildCharacterPrompt(formData);
    
    const parts = [
      { label: "Face", summary: `${formData.eyeShape} ${formData.eyeColor} eyes, ${formData.noseShape} nose` },
      { label: "Hair", summary: `${formData.hairLength} ${formData.hairColor} ${formData.hairstyle}` },
      { label: "Body", summary: `${formData.height}cm, ${formData.bodyType} build` },
      formData.outfitStyle && { label: "Clothing", summary: formData.outfitStyle },
      formData.pose && { label: "Pose", summary: formData.pose },
      { label: "Camera", summary: `${formData.camera}, ${formData.framing}` },
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
      toast.info("Enhancing prompt with AI...");
      const enhancedPrompt = await enhanceCharacterPrompt(formData);
      
      // Create parts summary for preview panel
      const parts = [
        { label: "Face", summary: `${formData.eyeShape} ${formData.eyeColor} eyes, ${formData.noseShape} nose` },
        { label: "Hair", summary: `${formData.hairLength} ${formData.hairColor} ${formData.hairstyle}` },
        { label: "Body", summary: `${formData.height}cm, ${formData.bodyType} build` },
        formData.outfitStyle && { label: "Clothing", summary: formData.outfitStyle },
        formData.pose && { label: "Pose", summary: formData.pose },
        { label: "Camera", summary: `${formData.camera}, ${formData.framing}` },
      ].filter(Boolean) as Array<{ label: string; summary: string }>;

      onPromptBuilt(enhancedPrompt, parts);
      toast.success("✅ Prompt enhanced successfully!");
      
      // Step 2: Generate image using RunPod with selected size
      setGenerationStatus("Generating image...");
      toast.info("🎨 Generating image...");
      
      const sizeConfig = getSizeByLabel(PORTRAIT_SIZES, selectedImageSize);
      const width = sizeConfig?.width || 720;
      const height = sizeConfig?.height || 1080;
      
      const imageUrl = await generateImage(
        enhancedPrompt,
        (status) => {
          setGenerationStatus(`Status: ${status}`);
          if (status === "IN_QUEUE") {
            toast.info("⏳ Job queued, waiting for processing...");
          } else if (status === "IN_PROGRESS") {
            toast.info("🎨 Creating your image...");
          }
        },
        width,
        height
      );
      
      setGeneratedImageUrl(imageUrl);
      setGenerationStatus("Completed!");
      onGenerate();
      toast.success("🎉 Image generated successfully!");
      
    } catch (error) {
      console.error('Failed to generate:', error);
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
        title="Character Builder"
        description="Create detailed character descriptions with comprehensive trait control"
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
        {/* A) Identity */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Identity</h3>
          
          <Field label="Gender" htmlFor="gender">
            <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
              <SelectTrigger id="gender" className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="unspecified">Unspecified</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Age" required error={errors.age} tooltip="Character's age in years">
            <div className="space-y-2">
              <Slider
                value={[formData.age]}
                onValueChange={(v) => updateField("age", v[0])}
                min={1}
                max={100}
                step={1}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">{formData.age} years</p>
            </div>
          </Field>

          <Field label="Ethnicity" htmlFor="ethnicity" caption="e.g., Mediterranean, South Asian, East African">
            <Input
              id="ethnicity"
              value={formData.ethnicity}
              onChange={(e) => updateField("ethnicity", e.target.value)}
              placeholder="Mediterranean"
              className="bg-secondary border-border"
            />
          </Field>
        </div>

        {/* B) Face */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Face</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Eye Color" required error={errors.eyeColor}>
              <Select value={formData.eyeColor} onValueChange={(v) => updateField("eyeColor", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="hazel">Hazel</SelectItem>
                  <SelectItem value="brown">Brown</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Eye Shape">
              <Select value={formData.eyeShape} onValueChange={(v) => updateField("eyeShape", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="almond">Almond</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="hooded">Hooded</SelectItem>
                  <SelectItem value="monolid">Monolid</SelectItem>
                  <SelectItem value="downturned">Downturned</SelectItem>
                  <SelectItem value="upturned">Upturned</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Eyebrow Shape">
              <Select value={formData.eyebrowShape} onValueChange={(v) => updateField("eyebrowShape", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft arch">Soft Arch</SelectItem>
                  <SelectItem value="straight">Straight</SelectItem>
                  <SelectItem value="angled">Angled</SelectItem>
                  <SelectItem value="thick">Thick</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Nose Shape">
              <Select value={formData.noseShape} onValueChange={(v) => updateField("noseShape", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight">Straight</SelectItem>
                  <SelectItem value="aquiline">Aquiline</SelectItem>
                  <SelectItem value="button">Button</SelectItem>
                  <SelectItem value="upturned">Upturned</SelectItem>
                  <SelectItem value="hooked">Hooked</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Lips">
              <Select value={formData.lips} onValueChange={(v) => updateField("lips", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thin">Thin</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="cupid's bow">Cupid's Bow</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Teeth">
              <Select value={formData.teeth} onValueChange={(v) => updateField("teeth", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not visible">Not Visible</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="braces">Braces</SelectItem>
                  <SelectItem value="gaps">Gaps</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Facial Hair">
            <Select value={formData.facialHair} onValueChange={(v) => updateField("facialHair", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="stubble">Stubble</SelectItem>
                <SelectItem value="mustache">Mustache</SelectItem>
                <SelectItem value="beard">Beard</SelectItem>
                <SelectItem value="goatee">Goatee</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Skin Color" required error={errors.skinColor}>
            <ColorInput
              value={formData.skinColor}
              onChange={(v) => updateField("skinColor", v)}
            />
          </Field>

          <Field label="Undertone">
            <Select value={formData.undertone} onValueChange={(v) => updateField("undertone", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Freckles">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.freckles}
                onCheckedChange={(v) => updateField("freckles", v)}
              />
              <Label className="text-sm">{formData.freckles ? "Yes" : "No"}</Label>
            </div>
          </Field>

          <Field label="Makeup Level" tooltip="0 = none, 3 = heavy">
            <div className="space-y-2">
              <Slider
                value={[formData.makeup]}
                onValueChange={(v) => updateField("makeup", v[0])}
                min={0}
                max={3}
                step={1}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">
                {["None", "Light", "Moderate", "Heavy"][formData.makeup]}
              </p>
            </div>
          </Field>

          <Field label="Expression" htmlFor="expression" caption="e.g., soft smile, serious, laughing, neutral">
            <Input
              id="expression"
              value={formData.expression}
              onChange={(e) => updateField("expression", e.target.value)}
              placeholder="soft smile"
              className="bg-secondary border-border"
            />
          </Field>
        </div>

        {/* C) Hair */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Hair</h3>
          
          <Field label="Hairstyle" htmlFor="hairstyle" error={errors.hairstyle} caption="e.g., bob, curly afro, pixie, undercut, wavy side-part">
            <Input
              id="hairstyle"
              value={formData.hairstyle}
              onChange={(e) => updateField("hairstyle", e.target.value)}
              placeholder="wavy side-part"
              className="bg-secondary border-border"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Hair Color">
              <ColorInput
                value={formData.hairColor}
                onChange={(v) => updateField("hairColor", v)}
              />
            </Field>

            <Field label="Hair Length">
              <Select value={formData.hairLength} onValueChange={(v) => updateField("hairLength", v)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buzz">Buzz</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="very-long">Very Long</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Accessories" caption="Press Enter or comma to add">
            <TagInput
              value={formData.accessories}
              onChange={(v) => updateField("accessories", v)}
              placeholder="glasses, earrings, nose ring..."
            />
          </Field>
        </div>

        {/* D) Body */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Body</h3>
          
          <Field label="Height (cm)" required>
            <div className="space-y-2">
              <Slider
                value={[formData.height]}
                onValueChange={(v) => updateField("height", v[0])}
                min={120}
                max={220}
                step={1}
                className="py-4"
              />
              <p className="text-sm text-muted-foreground text-center">{formData.height} cm</p>
            </div>
          </Field>

          <Field label="Body Type">
            <Select value={formData.bodyType} onValueChange={(v) => updateField("bodyType", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slim">Slim</SelectItem>
                <SelectItem value="athletic">Athletic</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="curvy">Curvy</SelectItem>
                <SelectItem value="muscular">Muscular</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Shoulders">
              <RadioGroup value={formData.shoulders} onValueChange={(v) => updateField("shoulders", v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="narrow" id="shoulders-narrow" />
                  <Label htmlFor="shoulders-narrow">Narrow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="shoulders-average" />
                  <Label htmlFor="shoulders-average">Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="broad" id="shoulders-broad" />
                  <Label htmlFor="shoulders-broad">Broad</Label>
                </div>
              </RadioGroup>
            </Field>

            <Field label="Chest">
              <RadioGroup value={formData.chest} onValueChange={(v) => updateField("chest", v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flat" id="chest-flat" />
                  <Label htmlFor="chest-flat">Flat</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="chest-average" />
                  <Label htmlFor="chest-average">Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="chest-full" />
                  <Label htmlFor="chest-full">Full</Label>
                </div>
              </RadioGroup>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Waist">
              <RadioGroup value={formData.waist} onValueChange={(v) => updateField("waist", v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="narrow" id="waist-narrow" />
                  <Label htmlFor="waist-narrow">Narrow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="waist-average" />
                  <Label htmlFor="waist-average">Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wide" id="waist-wide" />
                  <Label htmlFor="waist-wide">Wide</Label>
                </div>
              </RadioGroup>
            </Field>

            <Field label="Hips">
              <RadioGroup value={formData.hips} onValueChange={(v) => updateField("hips", v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="narrow" id="hips-narrow" />
                  <Label htmlFor="hips-narrow">Narrow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="hips-average" />
                  <Label htmlFor="hips-average">Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="wide" id="hips-wide" />
                  <Label htmlFor="hips-wide">Wide</Label>
                </div>
              </RadioGroup>
            </Field>
          </div>
        </div>

        {/* E) Clothing & Style */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Clothing & Style</h3>
          
          <Field label="Outfit Style" htmlFor="outfitStyle" error={errors.outfitStyle} caption="e.g., streetwear, formal, techwear, casual chic">
            <Input
              id="outfitStyle"
              value={formData.outfitStyle}
              onChange={(e) => updateField("outfitStyle", e.target.value)}
              placeholder="casual chic"
              className="bg-secondary border-border"
            />
          </Field>

          <Field label="Outfit Colors" caption="Press Enter or comma to add (hex or names)">
            <TagInput
              value={formData.outfitColors}
              onChange={(v) => updateField("outfitColors", v)}
              placeholder="teal, #ffd166..."
            />
          </Field>

          <Field label="Footwear" htmlFor="footwear" caption="e.g., white sneakers, leather boots">
            <Input
              id="footwear"
              value={formData.footwear}
              onChange={(e) => updateField("footwear", e.target.value)}
              placeholder="white sneakers"
              className="bg-secondary border-border"
            />
          </Field>
        </div>

        {/* F) Pose & Camera */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Pose & Camera</h3>
          
          <Field label="Pose" htmlFor="pose" caption="e.g., standing 3/4, seated, walking, hands-in-pockets">
            <Input
              id="pose"
              value={formData.pose}
              onChange={(e) => updateField("pose", e.target.value)}
              placeholder="standing 3/4"
              className="bg-secondary border-border"
            />
          </Field>

          <Field label="Camera" tooltip="Lens presets affect perspective (e.g., 85mm = portrait compression)">
            <Select value={formData.camera} onValueChange={(v) => updateField("camera", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="85mm portrait">85mm Portrait</SelectItem>
                <SelectItem value="35mm street">35mm Street</SelectItem>
                <SelectItem value="wide-angle">Wide-angle</SelectItem>
                <SelectItem value="telephoto">Telephoto</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Framing">
            <RadioGroup value={formData.framing} onValueChange={(v) => updateField("framing", v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="close-up" id="framing-closeup" />
                <Label htmlFor="framing-closeup">Close-up</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="framing-medium" />
                <Label htmlFor="framing-medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full-body" id="framing-fullbody" />
                <Label htmlFor="framing-fullbody">Full-body</Label>
              </div>
            </RadioGroup>
          </Field>

          <Field label="Lighting" htmlFor="lighting" tooltip="Describe light quality/direction (e.g., 'golden hour rim light')" caption="e.g., soft key with fill, golden hour, studio softbox">
            <Input
              id="lighting"
              value={formData.lighting}
              onChange={(e) => updateField("lighting", e.target.value)}
              placeholder="soft key with fill"
              className="bg-secondary border-border"
            />
          </Field>

          <Field label="Background" htmlFor="background" caption="e.g., studio gray, bokeh city lights, blank white, brick wall">
            <Input
              id="background"
              value={formData.background}
              onChange={(e) => updateField("background", e.target.value)}
              placeholder="bokeh city lights"
              className="bg-secondary border-border"
            />
          </Field>
        </div>

        {/* G) Global Stylistic Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Global Stylistic Controls</h3>
          
          <Field label="Image Size" tooltip="Select the output image dimensions">
            <Select value={selectedImageSize} onValueChange={setSelectedImageSize}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PORTRAIT_SIZES.map((size) => (
                  <SelectItem key={size.label} value={size.label}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getSizeByLabel(PORTRAIT_SIZES, selectedImageSize)?.description}
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

          <Field label="Style Hints" caption="High-level aesthetics (e.g., 'cinematic lighting', 'soft focus')">
            <TagInput
              value={formData.styleHints}
              onChange={(v) => updateField("styleHints", v)}
              placeholder="cinematic lighting, soft focus..."
            />
          </Field>

          <Field label="Negative Prompts" tooltip="Things to avoid (e.g., 'no watermark', 'no extra fingers')" caption="Things to avoid in the image">
            <TagInput
              value={formData.negativePrompts}
              onChange={(v) => updateField("negativePrompts", v)}
              placeholder="no watermark, no extra fingers..."
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
          title="Generated Image"
          description={generationStatus || "Your AI-generated character image"}
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
                    alt="Generated character" 
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
                      link.download = 'character-image.png';
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
