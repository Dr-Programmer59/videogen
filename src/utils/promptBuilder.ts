// Deterministic prompt builder - no AI, just pure string composition

export interface CharacterFormValues {
  // Identity
  gender: string;
  age: number;
  ethnicity: string;
  
  // Face
  eyeColor: string;
  eyeShape: string;
  eyebrowShape: string;
  noseShape: string;
  lips: string;
  teeth: string;
  facialHair: string;
  skinColor: string;
  undertone: string;
  freckles: boolean;
  makeup: number;
  expression: string;
  
  // Hair
  hairstyle: string;
  hairColor: string;
  hairLength: string;
  accessories: string[];
  
  // Body
  height: number;
  bodyType: string;
  shoulders: string;
  chest: string;
  waist: string;
  hips: string;
  
  // Clothing
  outfitStyle: string;
  outfitColors: string[];
  footwear: string;
  
  // Pose & Camera
  pose: string;
  camera: string;
  framing: string;
  lighting: string;
  background: string;
  
  // Style
  quality: string;
  styleHints: string[];
  negativePrompts: string[];
  extraNotes: string;
}

export interface EnvironmentFormValues {
  // Scene Basics
  location: string;
  timeOfDay: string;
  weather: string;
  season: string;
  mood: string;
  era: string;
  
  // Composition
  subjectFocus: string;
  camera: string;
  lighting: string;
  colorPalette: string[];
  foregroundElements: string[];
  midgroundElements: string[];
  backgroundElements: string[];
  
  // Style
  realism: string;
  styleLineage: string[];
  quality: string;
  styleHints: string[];
  negativePrompts: string[];
  extraNotes: string;
}

export interface I2VFormValues {
  prompt: string;
  frameCount: number;
  samplingSteps: number;
}

export interface T2VFormValues {
  prompt: string;
  size: string;
  frameCount: number;
  seed?: number;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function joinWithCommas(items: string[]): string {
  return items.filter(Boolean).join(', ');
}

export function buildCharacterPrompt(values: CharacterFormValues): string {
  const parts: string[] = [];
  
  // Start with prefix
  parts.push("Create Character with:");
  
  // Physical traits section
  const physicalTraits: string[] = [];
  
  if (values.age) physicalTraits.push(`${values.age} years old`);
  if (values.gender && values.gender !== 'unspecified') physicalTraits.push(values.gender);
  if (values.ethnicity) physicalTraits.push(`${values.ethnicity} descent`);
  
  // Skin
  if (values.skinColor) {
    physicalTraits.push(`${values.undertone || 'neutral'} ${values.skinColor} skin`);
  }
  if (values.freckles) physicalTraits.push("with freckles");
  
  // Face details
  if (values.eyeShape && values.eyeColor) {
    physicalTraits.push(`${values.eyeShape} ${values.eyeColor} eyes`);
  }
  if (values.eyebrowShape) physicalTraits.push(`${values.eyebrowShape} eyebrows`);
  if (values.noseShape) physicalTraits.push(`${values.noseShape} nose`);
  if (values.lips) physicalTraits.push(`${values.lips} lips`);
  if (values.teeth && values.teeth !== 'not visible') physicalTraits.push(`${values.teeth} teeth`);
  if (values.facialHair && values.facialHair !== 'none') physicalTraits.push(values.facialHair);
  
  // Expression and makeup
  if (values.makeup > 0) {
    const makeupLevels = ['', 'light', 'moderate', 'heavy'];
    physicalTraits.push(`${makeupLevels[values.makeup]} makeup`);
  }
  if (values.expression) physicalTraits.push(`${values.expression} expression`);
  
  // Hair
  if (values.hairstyle || values.hairColor || values.hairLength) {
    const hairParts: string[] = [];
    if (values.hairLength) hairParts.push(values.hairLength);
    if (values.hairColor) hairParts.push(values.hairColor);
    if (values.hairstyle) hairParts.push(values.hairstyle);
    physicalTraits.push(`${hairParts.join(' ')} hair`);
  }
  
  // Accessories
  if (values.accessories && values.accessories.length > 0) {
    physicalTraits.push(`wearing ${joinWithCommas(values.accessories)}`);
  }
  
  if (physicalTraits.length > 0) {
    parts.push(joinWithCommas(physicalTraits));
  }
  
  // Body section
  const bodyTraits: string[] = [];
  if (values.height) bodyTraits.push(`${values.height}cm tall`);
  if (values.bodyType) bodyTraits.push(`${values.bodyType} build`);
  
  const bodyDetails: string[] = [];
  if (values.shoulders && values.shoulders !== 'average') bodyDetails.push(`${values.shoulders} shoulders`);
  if (values.chest && values.chest !== 'average') bodyDetails.push(`${values.chest} chest`);
  if (values.waist && values.waist !== 'average') bodyDetails.push(`${values.waist} waist`);
  if (values.hips && values.hips !== 'average') bodyDetails.push(`${values.hips} hips`);
  
  if (bodyDetails.length > 0) {
    bodyTraits.push(`with ${joinWithCommas(bodyDetails)}`);
  }
  
  if (bodyTraits.length > 0) {
    parts.push(joinWithCommas(bodyTraits));
  }
  
  // Clothing section
  const clothingParts: string[] = [];
  if (values.outfitStyle) clothingParts.push(`${values.outfitStyle} outfit`);
  if (values.outfitColors && values.outfitColors.length > 0) {
    clothingParts.push(`in ${joinWithCommas(values.outfitColors)}`);
  }
  if (values.footwear) clothingParts.push(`with ${values.footwear}`);
  
  if (clothingParts.length > 0) {
    parts.push(joinWithCommas(clothingParts));
  }
  
  // Pose and camera section
  const sceneParts: string[] = [];
  if (values.pose) sceneParts.push(`in ${values.pose} pose`);
  if (values.camera) sceneParts.push(`shot with ${values.camera}`);
  if (values.framing) sceneParts.push(`${values.framing} framing`);
  if (values.lighting) sceneParts.push(`${values.lighting} lighting`);
  if (values.background) sceneParts.push(`against ${values.background} background`);
  
  if (sceneParts.length > 0) {
    parts.push(joinWithCommas(sceneParts));
  }
  
  // Style hints
  if (values.styleHints && values.styleHints.length > 0) {
    parts.push(`Style: ${joinWithCommas(values.styleHints)}`);
  }
  
  // Extra notes
  if (values.extraNotes) {
    parts.push(normalizeText(values.extraNotes));
  }
  
  // Negative prompts
  if (values.negativePrompts && values.negativePrompts.length > 0) {
    parts.push(`Avoid: ${joinWithCommas(values.negativePrompts)}`);
  }
  
  // Join all parts and normalize
  let prompt = parts.join('. ').replace(/\.\./g, '.').replace(/\s+/g, ' ');
  
  // Ensure max length ~900 chars
  if (prompt.length > 900) {
    prompt = prompt.substring(0, 897) + '...';
  }
  
  return normalizeText(prompt);
}

export function buildEnvironmentPrompt(values: EnvironmentFormValues): string {
  const parts: string[] = [];
  
  // Start with prefix
  parts.push("Create Environment with:");
  
  // Scene basics
  const sceneParts: string[] = [];
  if (values.location) sceneParts.push(values.location);
  if (values.timeOfDay) sceneParts.push(`during ${values.timeOfDay}`);
  if (values.weather) sceneParts.push(`${values.weather} weather`);
  if (values.season) sceneParts.push(`${values.season} season`);
  if (values.mood) sceneParts.push(`${values.mood} mood`);
  if (values.era) sceneParts.push(`${values.era} era`);
  
  if (sceneParts.length > 0) {
    parts.push(joinWithCommas(sceneParts));
  }
  
  // Composition
  const compositionParts: string[] = [];
  if (values.subjectFocus) compositionParts.push(`focusing on ${values.subjectFocus}`);
  
  if (values.foregroundElements && values.foregroundElements.length > 0) {
    compositionParts.push(`foreground featuring ${joinWithCommas(values.foregroundElements)}`);
  }
  if (values.midgroundElements && values.midgroundElements.length > 0) {
    compositionParts.push(`midground with ${joinWithCommas(values.midgroundElements)}`);
  }
  if (values.backgroundElements && values.backgroundElements.length > 0) {
    compositionParts.push(`background showing ${joinWithCommas(values.backgroundElements)}`);
  }
  
  if (compositionParts.length > 0) {
    parts.push(joinWithCommas(compositionParts));
  }
  
  // Camera and lighting
  const technicalParts: string[] = [];
  if (values.camera) technicalParts.push(`captured with ${values.camera}`);
  if (values.lighting) technicalParts.push(`${values.lighting} lighting`);
  
  if (technicalParts.length > 0) {
    parts.push(joinWithCommas(technicalParts));
  }
  
  // Color palette and style
  const styleParts: string[] = [];
  if (values.colorPalette && values.colorPalette.length > 0) {
    styleParts.push(`color palette of ${joinWithCommas(values.colorPalette)}`);
  }
  if (values.realism) styleParts.push(`${values.realism} style`);
  if (values.styleLineage && values.styleLineage.length > 0) {
    styleParts.push(`inspired by ${joinWithCommas(values.styleLineage)}`);
  }
  
  if (styleParts.length > 0) {
    parts.push(joinWithCommas(styleParts));
  }
  
  // Style hints
  if (values.styleHints && values.styleHints.length > 0) {
    parts.push(`Style: ${joinWithCommas(values.styleHints)}`);
  }
  
  // Extra notes
  if (values.extraNotes) {
    parts.push(normalizeText(values.extraNotes));
  }
  
  // Negative prompts
  if (values.negativePrompts && values.negativePrompts.length > 0) {
    parts.push(`Avoid: ${joinWithCommas(values.negativePrompts)}`);
  }
  
  // Join all parts and normalize
  let prompt = parts.join('. ').replace(/\.\./g, '.').replace(/\s+/g, ' ');
  
  // Ensure max length ~900 chars
  if (prompt.length > 900) {
    prompt = prompt.substring(0, 897) + '...';
  }
  
  return normalizeText(prompt);
}

export function buildI2VPrompt(values: I2VFormValues): string {
  const parts: string[] = [
    `Animate the provided image with subtle motions: ${values.prompt}.`,
    `${values.frameCount} frames`,
    `${values.samplingSteps} sampling steps`
  ];
  
  return normalizeText(parts.join(', '));
}

export function buildT2VPrompt(values: T2VFormValues): string {
  const parts: string[] = [
    `Cinematic video: ${values.prompt}.`,
    `Size ${values.size}`,
    `${values.frameCount} frames`
  ];
  
  if (values.seed !== undefined && values.seed !== null) {
    parts.push(`seed ${values.seed}`);
  }
  
  return normalizeText(parts.join(', '));
}
