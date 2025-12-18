// openaiService.ts
import OpenAI from 'openai';
import { CharacterFormValues, EnvironmentFormValues } from './promptBuilder';

export interface CinematicScene {
  sceneNumber: number;
  title: string;
  duration: number; // in seconds (5 or 8)
  visualDescription: string;
  detailedPrompt: string;
  transitionIn: string; // How scene starts (transition from previous)
  transitionOut: string; // How scene ends (transition to next)
  cameraWork: string;
  lighting: string;
  colorGrading: string;
  audioScript?: string;
}

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error(
      'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file',
    );
  }

  return new OpenAI({
    apiKey,
    // NOTE: in production, do this on a backend instead of the browser
    dangerouslyAllowBrowser: true,
  });
};

/**
 * Formats character details into a structured description for the AI
 */
const formatCharacterDetails = (formData: CharacterFormValues): string => {
  const details: string[] = [];

  // Identity
  details.push('=== IDENTITY ===');
  if (formData.gender && formData.gender !== 'unspecified') {
    details.push(`Gender: ${formData.gender}`);
  }
  details.push(`Age: ${formData.age} years`);
  if (formData.ethnicity) details.push(`Ethnicity: ${formData.ethnicity}`);

  // Face
  details.push('\n=== FACE ===');
  details.push(`Eyes: ${formData.eyeShape} ${formData.eyeColor}`);
  details.push(`Eyebrows: ${formData.eyebrowShape}`);
  details.push(`Nose: ${formData.noseShape}`);
  details.push(`Lips: ${formData.lips}`);
  if (formData.teeth !== 'not visible') details.push(`Teeth: ${formData.teeth}`);
  if (formData.facialHair !== 'none') details.push(`Facial Hair: ${formData.facialHair}`);
  details.push(`Skin Color: ${formData.skinColor} (${formData.undertone} undertone)`);
  if (formData.freckles) details.push('Has freckles');
  if (formData.makeup > 0) {
    const makeupLevels = ['none', 'light', 'moderate', 'heavy'];
    details.push(`Makeup: ${makeupLevels[formData.makeup]}`);
  }
  if (formData.expression) details.push(`Expression: ${formData.expression}`);

  // Hair
  details.push('\n=== HAIR ===');
  details.push(`Style: ${formData.hairstyle || 'unspecified'}`);
  details.push(`Color: ${formData.hairColor}`);
  details.push(`Length: ${formData.hairLength}`);
  if (formData.accessories && formData.accessories.length > 0) {
    details.push(`Accessories: ${formData.accessories.join(', ')}`);
  }

  // Body
  details.push('\n=== BODY ===');
  details.push(`Height: ${formData.height}cm`);
  details.push(`Body Type: ${formData.bodyType}`);
  if (formData.shoulders !== 'average') details.push(`Shoulders: ${formData.shoulders}`);
  if (formData.chest !== 'average') details.push(`Chest: ${formData.chest}`);
  if (formData.waist !== 'average') details.push(`Waist: ${formData.waist}`);
  if (formData.hips !== 'average') details.push(`Hips: ${formData.hips}`);

  // Clothing
  details.push('\n=== CLOTHING ===');
  if (formData.outfitStyle) details.push(`Style: ${formData.outfitStyle}`);
  if (formData.outfitColors && formData.outfitColors.length > 0) {
    details.push(`Colors: ${formData.outfitColors.join(', ')}`);
  }
  if (formData.footwear) details.push(`Footwear: ${formData.footwear}`);

  // Pose & Camera
  details.push('\n=== SCENE & CAMERA ===');
  if (formData.pose) details.push(`Pose: ${formData.pose}`);
  details.push(`Camera: ${formData.camera}`);
  details.push(`Framing: ${formData.framing}`);
  if (formData.lighting) details.push(`Lighting: ${formData.lighting}`);
  if (formData.background) details.push(`Background: ${formData.background}`);

  // Style
  details.push('\n=== STYLE ===');
  details.push(`Quality: ${formData.quality}`);
  if (formData.styleHints && formData.styleHints.length > 0) {
    details.push(`Style Hints: ${formData.styleHints.join(', ')}`);
  }
  if (formData.negativePrompts && formData.negativePrompts.length > 0) {
    details.push(`Avoid: ${formData.negativePrompts.join(', ')}`);
  }
  if (formData.extraNotes) details.push(`Extra Notes: ${formData.extraNotes}`);

  return details.join('\n');
};

/**
 * Enhances a character prompt using OpenAI GPT-5 (Responses API)
 * Generates a natural, ultra-detailed portrait-style prompt like the horror example,
 * but adapted to the character's parameters and style hints.
 */
export const enhanceCharacterPrompt = async (
  formData: CharacterFormValues,
): Promise<string> => {
  const client = getOpenAIClient();
  const characterDetails = formatCharacterDetails(formData);

  console.log('=== Character Details ===');
  console.log(characterDetails);
  console.log('=========================\n');

  // Example of the target style – this is what we want the model to imitate in tone/structure
  const exampleStyle = `
Ultra-detailed horror character portrait of a 38-year-old man. He has a tall, lean but slightly broad-shouldered build, with a gaunt, angular face and high, prominent cheekbones. His skin is pale with a slight grayish tone and a rough, weathered texture, like someone who hasn’t seen the sun in years.

He has a huge, thick, unkempt dark brown beard with a few gray strands, growing long down his neck and jawline, slightly patchy in some spots as if burned or torn out. His jaw is sharp and narrow, with a pointed chin just visible beneath the beard. His nose is long and slightly crooked, as if it has been broken before.

One side of his face, from eyebrow to cheek, is deeply scarred with old, healed cuts, forming uneven, raised tissue. Along these scars are fresh but not overly gory cuts with dark, dried blood and faint redness, but no exposed bone. His skin around the scars looks tight and slightly twisted.

His eyes are mismatched: the left eye is a cold, icy blue, very sharp and piercing; the right eye is milky, cloudy white, like an old injury, with a faint eerie glow. His eyebrows are thick, heavy, and furrowed, giving him a permanent hostile glare. His expression is calm but terrifyingly empty, lips relaxed, not smiling, with a hint of dryness and small cracks.

He has long, greasy dark brown hair, slightly wavy, hanging around his face and down to his shoulders, some strands clumping together as if damp. His forehead is tall and slightly creased with subtle wrinkles from frowning and anger. His neck is thin and sinewy with a few faint scars.

He wears a torn, dirty, dark overcoat over a stained, off-white shirt with missing buttons. The collar is crooked and loose, revealing thin, bony collarbones and pale scarred skin at the base of the neck. His clothing shows faded, dried stains and grime, suggesting past violence without being overly graphic.

Style: hyper-realistic, high resolution, sharp details, dramatic, horror character design, focus on face and upper body, no background details.
`.trim();

  const systemPrompt = `You are an expert at creating prompts for AI image generation models like Stable Diffusion, DALL-E, and Midjourney.
Your job is to turn structured character data into a single, ultra-detailed, natural-sounding character portrait prompt.

Style rules:
- Always start the final prompt with: "Create character with:"
- Immediately follow with a phrase like: "an ultra-detailed [GENRE / MOOD] character portrait of a ..."
  - Infer GENRE / MOOD from the style hints or overall description:
    - e.g. "horror character portrait", "dark fantasy character portrait", "cinematic sci-fi portrait", "soft, warm slice-of-life portrait", etc.
    - If there is no clear genre, just use "ultra-detailed character portrait".
- Write in smooth, cinematic prose, similar to the example style: multiple clauses, rich but controlled detail.
- Avoid robotic "label: value" phrasing. Use natural descriptive sentences and flowing comma-separated phrases.
- It's okay to keep exact age when it matters (e.g. 38-year-old), but you may also use natural phrasing like "in his late 30s" if more natural.
- Convert height into relative terms when possible (e.g. "tall", "short", "about average height"), unless the exact number is visually important.
- Use simple color words, optionally adding hex codes in parentheses, e.g. "warm tan skin (#c58c5a)".
- Group camera and style details into a compact end segment:
  - e.g. "hyper-realistic, high-resolution, sharp details, dramatic lighting, focus on face and upper body, minimal background".
- Respect negative prompts / things to avoid by simply not describing them.
- Keep the total prompt under 900 characters.
- Focus only on visual and stylistic details that matter for image generation.
- Output ONLY the final prompt string, no explanations.`;

  const userPrompt = `Based on the character details below, write a single prompt in the style of the following example.

Example target style (for tone and structure, NOT to be copied literally):

${exampleStyle}

Now, using that style as a guide, create a prompt for this character:

${characterDetails}

Requirements:
- Start with: "Create character with:"
- Match the level of detail, flow, and cinematic feeling of the example.
- Adapt the genre/mood to the character's style hints (e.g. horror, fantasy, sci-fi, cozy, realistic drama, etc.).
- Focus on visual and stylistic details from the character data.
- Do NOT add backstory that is not implied visually.`;

  try {
    const response = await client.responses.create({
      model: 'gpt-5', // or 'gpt-5.1' if available to you
      instructions: systemPrompt,
      input: userPrompt,
    //   temperature: 0.7,
      reasoning: {
        effort: 'low', // keep reasoning light so tokens go into the actual output
      },
    });

    console.log('OpenAI response received');

    // Preferred shortcut: combined text from Responses API
    let enhancedPrompt = ((response as any).output_text as string | undefined) ?? '';

    // Clean control characters that might break JSON parsing
    enhancedPrompt = enhancedPrompt
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
      .trim();

    console.log('=== Enhanced Prompt by OpenAI ===');
    console.log(enhancedPrompt);
    console.log('==================================\n');

    if (!enhancedPrompt) {
      throw new Error('OpenAI returned an empty prompt');
    }

    return enhancedPrompt;
  } catch (error: any) {
    console.error('Error enhancing prompt with OpenAI:', error);

    if (error?.response) {
      console.error('OpenAI error response:', JSON.stringify(error.response, null, 2));
    } else if (error?.error) {
      console.error('OpenAI error payload:', JSON.stringify(error.error, null, 2));
    }

    throw error;
  }
};

/**
 * Formats environment details into a structured description for the AI
 */
const formatEnvironmentDetails = (formData: EnvironmentFormValues): string => {
  const details: string[] = [];
  
  // Scene Basics
  details.push('=== SCENE BASICS ===');
  if (formData.location) details.push(`Location: ${formData.location}`);
  if (formData.timeOfDay) details.push(`Time of Day: ${formData.timeOfDay}`);
  if (formData.weather) details.push(`Weather: ${formData.weather}`);
  if (formData.season) details.push(`Season: ${formData.season}`);
  if (formData.mood) details.push(`Mood: ${formData.mood}`);
  if (formData.era) details.push(`Era: ${formData.era}`);
  
  // Composition
  details.push('\n=== COMPOSITION ===');
  if (formData.subjectFocus) details.push(`Subject Focus: ${formData.subjectFocus}`);
  
  if (formData.foregroundElements && formData.foregroundElements.length > 0) {
    details.push(`Foreground: ${formData.foregroundElements.join(', ')}`);
  }
  if (formData.midgroundElements && formData.midgroundElements.length > 0) {
    details.push(`Midground: ${formData.midgroundElements.join(', ')}`);
  }
  if (formData.backgroundElements && formData.backgroundElements.length > 0) {
    details.push(`Background: ${formData.backgroundElements.join(', ')}`);
  }
  
  // Camera & Lighting
  details.push('\n=== CAMERA & LIGHTING ===');
  if (formData.camera) details.push(`Camera: ${formData.camera}`);
  if (formData.lighting) details.push(`Lighting: ${formData.lighting}`);
  
  // Color & Style
  details.push('\n=== COLOR & STYLE ===');
  if (formData.colorPalette && formData.colorPalette.length > 0) {
    details.push(`Color Palette: ${formData.colorPalette.join(', ')}`);
  }
  if (formData.realism) details.push(`Realism Level: ${formData.realism}`);
  if (formData.styleLineage && formData.styleLineage.length > 0) {
    details.push(`Style Inspiration: ${formData.styleLineage.join(', ')}`);
  }
  
  // Quality & Style Hints
  details.push('\n=== QUALITY & STYLE ===');
  details.push(`Quality: ${formData.quality}`);
  if (formData.styleHints && formData.styleHints.length > 0) {
    details.push(`Style Hints: ${formData.styleHints.join(', ')}`);
  }
  if (formData.negativePrompts && formData.negativePrompts.length > 0) {
    details.push(`Avoid: ${formData.negativePrompts.join(', ')}`);
  }
  if (formData.extraNotes) details.push(`Extra Notes: ${formData.extraNotes}`);
  
  return details.join('\n');
};

/**
 * Enhances an environment prompt using OpenAI
 * Takes all environment details and asks OpenAI to create an optimized prompt for image generation
 */
export const enhanceEnvironmentPrompt = async (formData: EnvironmentFormValues): Promise<string> => {
  try {
    const client = getOpenAIClient();
    const environmentDetails = formatEnvironmentDetails(formData);
    
    console.log('=== Environment Details ===');
    console.log(environmentDetails);
    console.log('============================\n');
    
    const systemPrompt = `You are an expert at creating prompts for AI image generation models like Stable Diffusion, DALL-E, and Midjourney. 
Your task is to take detailed environment/scene descriptions and convert them into optimized, concise prompts that will generate high-quality environment images.

Guidelines:
- Start with "Create environment with:"
- Be descriptive but concise
- Use comma-separated descriptors
- Prioritize the most important visual details
- Use photography and art terminology when appropriate
- Include composition layers (foreground, midground, background)
- Keep the total prompt under 900 characters
- Focus on visual details that matter for image generation
- Maintain the quality, style, and technical specifications provided`;

    const userPrompt = `Based on the following environment details, create an optimized prompt for AI image generation. Start with "Create environment with:" and then describe the scene in a way that will produce the best possible image.

${environmentDetails}

Generate a single, optimized prompt that captures all the essential visual details for this environment/scene.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o', // Using GPT-4o - the most advanced model for best results
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const enhancedPrompt = response.choices[0]?.message?.content?.trim() || '';
    
    console.log('=== Enhanced Environment Prompt by OpenAI ===');
    console.log(enhancedPrompt);
    console.log('=============================================\n');
    
    return enhancedPrompt;
  } catch (error) {
    console.error('Error enhancing environment prompt with OpenAI:', error);
    throw error;
  }
};

/**
 * Analyzes and enhances transitions between consecutive scenes
 * Ensures smooth visual flow by validating transition matching
 */
const enhanceSceneTransitions = async (
  scenes: CinematicScene[],
  client: OpenAI
): Promise<CinematicScene[]> => {
  if (scenes.length <= 1) return scenes;

  console.log('🔗 Analyzing scene transitions for smooth flow...');

  // Check each transition pair
  const transitionIssues: string[] = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    const currentScene = scenes[i];
    const nextScene = scenes[i + 1];

    // Extract key phrases from transitionOut
    const outPhrase = currentScene.transitionOut.toLowerCase();
    const inPhrase = nextScene.transitionIn.toLowerCase();

    // Look for common keywords
    const hasMatchingKeywords = 
      (outPhrase.includes('forward') && inPhrase.includes('forward')) ||
      (outPhrase.includes('left') && inPhrase.includes('left')) ||
      (outPhrase.includes('right') && inPhrase.includes('right')) ||
      (outPhrase.includes('up') && inPhrase.includes('up')) ||
      (outPhrase.includes('down') && inPhrase.includes('down')) ||
      (outPhrase.includes('zoom') && inPhrase.includes('zoom')) ||
      (outPhrase.includes('pan') && inPhrase.includes('pan')) ||
      (outPhrase.includes('turn') && inPhrase.includes('turn')) ||
      (outPhrase.includes('look') && inPhrase.includes('look')) ||
      (outPhrase.includes('gaze') && inPhrase.includes('gaze'));

    if (!hasMatchingKeywords) {
      transitionIssues.push(
        `Scene ${i + 1} → ${i + 2}: TransitionOut "${currentScene.transitionOut}" doesn't match TransitionIn "${nextScene.transitionIn}"`
      );
    }
  }

  // If there are issues, ask OpenAI to fix them
  if (transitionIssues.length > 0) {
    console.log('⚠️ Transition issues detected:', transitionIssues);
    console.log('🤖 Asking OpenAI to fix transition matching...');

    const fixPrompt = `You are a video editing expert. I have ${scenes.length} scenes with transition issues. Your task is to fix the "transitionIn" and "transitionOut" fields to ensure smooth visual flow between consecutive scenes.

CURRENT SCENES:
${scenes.map((s, i) => `
Scene ${s.sceneNumber}: ${s.title}
- TransitionOut: "${s.transitionOut}"
${i < scenes.length - 1 ? `- Next Scene TransitionIn: "${scenes[i + 1].transitionIn}"` : ''}
`).join('\n')}

ISSUES FOUND:
${transitionIssues.join('\n')}

TASK: For each scene, provide UPDATED "transitionIn" and "transitionOut" that:
1. Scene N's "transitionOut" MUST explicitly mention specific visual elements/actions
2. Scene N+1's "transitionIn" MUST reference those SAME elements/actions from Scene N's "transitionOut"
3. Use IDENTICAL key phrases (e.g., "camera pans right", "character turns left", "bike accelerates forward")
4. Be specific about direction, motion, objects, and visual continuity

Return JSON array with updated transitions:
[
  {
    "sceneNumber": 1,
    "transitionIn": "updated or keep original",
    "transitionOut": "updated to match scene 2's start"
  },
  {
    "sceneNumber": 2,
    "transitionIn": "updated to match scene 1's end",
    "transitionOut": "updated to match scene 3's start"
  },
  ...
]`;

    try {
      const fixResponse = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a professional video editor specializing in seamless scene transitions.' },
          { role: 'user', content: fixPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const fixedTransitionsContent = fixResponse.choices[0]?.message?.content?.trim();
      if (fixedTransitionsContent) {
        const fixedData = JSON.parse(fixedTransitionsContent);
        const fixedTransitions = fixedData.transitions || fixedData.scenes || fixedData;

        // Apply fixed transitions
        const enhancedScenes = scenes.map(scene => {
          const fixed = fixedTransitions.find((f: any) => f.sceneNumber === scene.sceneNumber);
          if (fixed) {
            console.log(`✅ Updated Scene ${scene.sceneNumber} transitions`);
            return {
              ...scene,
              transitionIn: fixed.transitionIn || scene.transitionIn,
              transitionOut: fixed.transitionOut || scene.transitionOut
            };
          }
          return scene;
        });

        console.log('✅ Transitions enhanced successfully!');
        return enhancedScenes;
      }
    } catch (fixError) {
      console.error('❌ Failed to fix transitions with OpenAI:', fixError);
      console.log('ℹ️ Continuing with original transitions');
    }
  } else {
    console.log('✅ All transitions look good!');
  }

  return scenes;
};

/**
 * Generate cinematic scenes for a video story using OpenAI
 * Ensures visual continuity across all scenes with consistent characters, environment, and color grading
 * Max 8 seconds per scene
 */
export const generateCinematicScenes = async (
  storyIdea: string,
  targetDuration: number = 40, // total video duration in seconds
  voiceoverTone: string = 'calm-inspiring',
  testingMode: boolean = false // If true, generates only 2 scenes
): Promise<CinematicScene[]> => {
  try {
    const client = getOpenAIClient();
    
    // Calculate number of scenes needed (8 seconds max per scene)
    const maxSceneDuration = 8;
    const minScenes = Math.ceil(targetDuration / maxSceneDuration);
    const sceneCount = testingMode ? 2 : Math.max(minScenes, 5); // Testing: 2 scenes, Production: at least 5
    
    console.log('🎬 Generating cinematic scenes with OpenAI...');
    console.log('Story Idea:', storyIdea);
    console.log('Target Duration:', targetDuration, 'seconds');
    console.log('Scene Count:', sceneCount, testingMode ? '(TESTING MODE)' : '');
    console.log('Voiceover Tone:', voiceoverTone);

    const systemPrompt = `You are a master cinematographer and AI video generation specialist who creates EXTREMELY DETAILED, vivid scene prompts for professional video production.

Your task is to break down a story concept into ${sceneCount} cinematic scenes that flow seamlessly together.

CRITICAL REQUIREMENTS:
1. Each scene MUST be either 5 OR 8 seconds long (NO OTHER DURATIONS - API restriction)
2. Total duration should be approximately ${targetDuration} seconds

3. ABSOLUTE VISUAL CONTINUITY - THIS IS NON-NEGOTIABLE:
   
   CHARACTER CONSISTENCY:
   - EXACT SAME CHARACTER(s) in every scene - describe their COMPLETE appearance identically
   - Same age, ethnicity, build, height, facial features in ALL scenes
   - Same hair color, style, length in ALL scenes
   - Same clothing throughout (describe exact items, colors, fabrics in EVERY scene)
   - Same accessories (watch, jewelry, glasses, etc.) in ALL scenes
   - Only facial expressions and body language can change
   
   PROPS & OBJECTS CONSISTENCY:
   - If a scene has a bike/car/motorcycle - describe it EXACTLY the same in subsequent scenes
   - Include make, model, color, condition, distinguishing features
   - Props must remain consistent (same camera, backpack, water bottle, etc.)
   - Vehicles should have same appearance, damage, modifications across all scenes
   
   ENVIRONMENT CONSISTENCY:
   - Same location type throughout (if mountains, stay in mountains)
   - Same time period/era in all scenes
   - Weather and time of day should progress naturally
   - Architectural style and setting must remain consistent
   
   COLOR GRADING & THEME:
   - EXACT SAME color palette in ALL scenes (specify in every prompt)
   - Same color grading style throughout (e.g., "warm golden sunset tones", "cool teal and orange")
   - Same saturation level across all scenes
   - Same film stock/look (e.g., "Kodak Portra 400 warmth", "Fuji Velvia vibrant")
   - Lighting mood should be consistent (all golden hour, or all overcast, etc.)

4. SCENE TRANSITIONS (CRITICAL FOR SMOOTH FLOW):
   
   TRANSITIONS MUST BE EXPLICITLY MATCHED BETWEEN CONSECUTIVE SCENES.
   
   TRANSITION TYPES (choose appropriate for scene content):
   
   A. MOTION CONTINUITY:
      - Scene ends: "character/camera moving [direction]"
      - Next scene starts: "continuing [same direction] motion from previous scene"
      - Example: End="camera tracks forward into tunnel" → Start="emerging from tunnel, continuing forward motion"
   
   B. GAZE/ATTENTION SHIFT:
      - Scene ends: "character looks/turns toward [specific element]"
      - Next scene starts: "[element] that captured character's attention, as they approach/observe"
      - Example: End="character's eyes widen looking skyward" → Start="the stunning sunset sky they're witnessing fills frame"
   
   C. TEMPORAL PROGRESSION:
      - Scene ends: "light begins to fade/brighten"
      - Next scene starts: "moments later, lighting has shifted to [new state]"
      - Example: End="golden hour sun touching horizon" → Start="twilight blue overtaking the sky, moments after sunset"
   
   D. SPATIAL REVEAL:
      - Scene ends: "camera pulls back/pans revealing [element]"
      - Next scene starts: "closer view of [element] revealed in previous scene"
      - Example: End="camera rises revealing mountain vista" → Start="within the mountain landscape just revealed"
   
   E. ACTION CONSEQUENCE:
      - Scene ends: "character initiates action (opens door, starts engine, throws object)"
      - Next scene starts: "result of action (stepping through doorway, bike roaring to life, object landing)"
      - Example: End="hand grips motorcycle throttle, engine revving" → Start="bike surging forward with burst of acceleration"
   
   F. MATCH CUT:
      - Scene ends: "focus on specific shape/color/element"
      - Next scene starts: "similar shape/color/element in new context"
      - Example: End="circular coffee cup rim fills frame" → Start="circular motorcycle wheel, similar framing and color"
   
   MANDATORY TRANSITION MATCHING:
   - Scene N's "transitionOut" MUST connect to Scene N+1's "transitionIn"
   - Use IDENTICAL key phrases (e.g., both mention "forward motion", "gazing at sunset", "opening door")
   - Specify the SAME visual elements in both transitions
   - Be explicit about direction, speed, and visual continuity

5. DETAILED PROMPT REQUIREMENTS (MOST IMPORTANT):
   The "detailedPrompt" field is sent directly to AI video generation and MUST be EXTREMELY comprehensive:
   
   MINIMUM LENGTH: 250-350 words per scene (SHORT PROMPTS ARE UNACCEPTABLE)
   
   MUST INCLUDE IN EVERY SCENE:
   
   ✓ CHARACTER DETAILS (if characters present):
     - Physical appearance: age, ethnicity, build, height, facial features
     - Hair: color, style, length, texture
     - Skin tone: specific description, any notable features
     - Clothing: exact items, colors, fabrics, fit, style
     - Facial expression: specific emotion, eyes, mouth, brows
     - Body language: posture, gestures, movement quality
     - Accessories: jewelry, glasses, bags, etc.
   
   ✓ ENVIRONMENT DETAILS:
     - Specific location type (e.g., "modern glass-walled penthouse", not just "apartment")
     - Architectural elements: walls, floors, ceiling, windows, doors
     - Foreground objects: furniture, props, textures
     - Midground elements: what's visible in medium distance
     - Background: distant elements, depth, atmosphere
     - Materials and textures: wood grain, metal, fabric, concrete, glass
     - Scale and dimensions: spacious/cramped, tall ceilings, etc.
   
   ✓ COLOR PALETTE (be extremely specific):
     - Primary colors: dominant hues with specific names (not just "blue" but "deep navy blue #1A3A52")
     - Secondary colors: supporting tones
     - Accent colors: highlights and pops of color
     - Color temperature: warm (golden, amber) or cool (teal, slate)
     - Saturation level: vibrant, muted, desaturated, pastel
     - Color grading style: "teal and orange blockbuster", "desaturated Nordic", "warm golden hour", "cyberpunk neon", etc.
   
   ✓ LIGHTING (comprehensive setup):
     - Light sources: natural (sun, moon, sky) or artificial (lamps, screens, candles)
     - Direction: front, back, side, top, bottom lighting
     - Quality: soft/diffused or hard/direct
     - Color temperature: warm (3000K candle) to cool (6500K overcast day)
     - Shadows: deep/subtle, sharp/soft edges
     - Highlights: where light hits surfaces
     - Ambient light: overall illumination level
     - Mood: dramatic, ethereal, naturalistic, moody, bright, etc.
   
   ✓ ACTION & MOVEMENT:
     - What is happening: specific actions, not vague descriptions
     - Character movements: walking, gesturing, turning, etc.
     - Camera-relative motion: moving toward/away, left/right
     - Speed and rhythm: slow motion, real-time, energetic
     - Environmental motion: wind, rain, leaves, traffic, etc.
   
   ✓ ATMOSPHERIC DETAILS:
     - Weather conditions: clear, cloudy, rain, fog, snow
     - Time of day: exact (dawn, mid-morning, golden hour, dusk, night)
     - Particles: dust motes, fog, rain, snow, smoke, steam
     - Depth of field: sharp throughout or blurred background
     - Bokeh: circular light blurs, quality of out-of-focus areas
     - Air quality: crisp, hazy, smoky, humid
   
   ✓ TECHNICAL & COMPOSITIONAL:
     - Composition: rule of thirds, centered, symmetrical, golden ratio
     - Aspect ratio feeling: cinematic widescreen, square, vertical
     - Lens characteristic: wide-angle distortion, telephoto compression, normal perspective
     - Visual style references: "Blade Runner aesthetic", "Wes Anderson symmetry", "Roger Deakins naturalism"

5. EXAMPLE OF REQUIRED DETAIL LEVEL:
   
   BAD (too short): "A woman sits in a cafe looking out the window. Warm lighting. Cozy atmosphere."
   
   GOOD (this is the standard): "Medium close-up of a contemplative 32-year-old woman with shoulder-length auburn hair tied in a loose, messy bun, several strands framing her face. She has fair skin with light freckles across her nose and cheeks, wearing a chunky cream-colored cable-knit turtleneck sweater and delicate gold hoop earrings. Her hazel eyes gaze thoughtfully out a rain-streaked window, expression peaceful but tinged with melancholy, lips slightly parted. She's seated at a small round wooden table with a white ceramic mug of steaming coffee in her hands, fingers wrapped around it for warmth. The setting is a cozy Scandinavian-style cafe with white-painted brick walls, warm oak wood floors, and hanging Edison bulb lights creating a soft amber glow. Foreground shows soft-focus greenery (potted ferns), midground has the woman and table, background features blurred cafe patrons and large windows showing gray rainy streets outside. Color palette is warm and inviting: cream whites, soft amber, muted sage green, warm oak tones, with desaturated outdoor grays visible through windows. Lighting is primarily soft natural light from large windows (diffused by overcast sky, ~6000K color temperature) mixed with warm artificial Edison bulbs (~2700K), creating a gentle contrast between cool window light on her face and warm ambient cafe glow. Shallow depth of field (f/2.8 feel) keeps woman in sharp focus while background softly blurs. Atmosphere includes visible steam rising from coffee, rain droplets on window glass creating subtle bokeh, and a general sense of hygge coziness. Cinematic composition follows rule of thirds with woman's eyes on upper third line. Overall aesthetic: introspective, calm, visually warm with emotional coolness - reminiscent of intimate indie film cinematography like Autumn Sonata or Lost in Translation."

Return ONLY a valid JSON object with a "scenes" array. No additional text.`;

    const userPrompt = `Create ${sceneCount} cinematic scenes for this story:

"${storyIdea}"

CRITICAL INSTRUCTIONS:
- Each scene: MUST be exactly 5 OR 8 seconds (NO OTHER VALUES - API only accepts 5 or 8)
- Total: ~${targetDuration} seconds
- DETAILED PROMPTS: Each "detailedPrompt" field MUST be 250-350 words minimum

CHARACTER & PROPS CONSISTENCY (NON-NEGOTIABLE):
- Character appearance MUST be IDENTICAL in every scene (age, face, hair, clothing, accessories)
- Props (bike, car, camera, bag, etc.) MUST be described EXACTLY the same in all scenes
- If scene 1 has "matte black Yamaha motorcycle with red racing stripes" - EVERY subsequent scene must describe it identically
- Color grading and theme MUST remain consistent throughout all scenes

TRANSITIONS (MANDATORY - MUST BE EXPLICITLY MATCHED):
- Scene 1: Only needs "transitionOut" (sets up Scene 2)
- Scenes 2 to N-1: Need BOTH "transitionIn" (matches previous scene's transitionOut) AND "transitionOut" (sets up next scene)
- Scene N (last): Only needs "transitionIn" (matches previous scene's transitionOut)

TRANSITION MATCHING REQUIREMENTS:
- Scene 1 transitionOut: "camera pans right revealing distant mountains"
- Scene 2 transitionIn: "continuing the rightward pan, mountains now dominating frame" (MUST reference "rightward pan" and "mountains")
- Scene 2 transitionOut: "character turns left as bike accelerates forward"
- Scene 3 transitionIn: "bike surging forward from acceleration, character facing left" (MUST reference "accelerates forward", "turns left", "bike")

USE IDENTICAL KEY PHRASES:
- If Scene X ends with "gazing at sunset", Scene X+1 must start with "the sunset [character] was gazing at"
- If Scene X ends with "door swinging open", Scene X+1 must start with "stepping through the open door"
- If Scene X ends with "racing downhill", Scene X+1 must start with "continuing the downhill race"

QUALITY CHECK BEFORE RETURNING:
✓ Is each detailedPrompt at least 250 words?
✓ Does each detailedPrompt describe character appearance IDENTICALLY?
✓ Are props and vehicles described EXACTLY the same across all scenes?
✓ Is the color grading IDENTICAL in all scenes?
✓ Does each scene have transitionIn and transitionOut?
✓ Do transitions connect logically between consecutive scenes?

Return JSON object with this exact structure:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Evocative scene title",
      "duration": 5,
      "visualDescription": "Brief 2-3 sentence overview of what happens",
      "detailedPrompt": "COMPREHENSIVE 250-350 word prompt with IDENTICAL character description (age, ethnicity, hair, skin, clothing, expression, body language), IDENTICAL props/vehicles (exact make, model, color, features), complete environment description, EXACT SAME color palette as all other scenes (primary/secondary/accent colors with names, saturation, temperature, grading style), full lighting setup, specific actions and movements, atmospheric details, and technical/compositional notes. MUST include transition hints at start (first 1-2 seconds) and end (last 1-2 seconds).",
      "transitionIn": "[MUST MATCH PREVIOUS SCENE'S transitionOut] How this scene visually begins. Use IDENTICAL key phrases from previous scene's ending. Example: If previous ended with 'camera tracks forward into tunnel', this starts with 'emerging from tunnel, continuing forward tracking motion, walls opening to reveal...'",
      "transitionOut": "[MUST SET UP NEXT SCENE'S transitionIn] How this scene visually ends. Be SPECIFIC about visual elements, motion, and direction that next scene will continue. Example: 'character's gaze shifts upward toward the sky, expression of wonder, camera beginning to tilt up following their sight line'",
      "cameraWork": "Detailed shot type, specific movement, angle, lens characteristics",
      "lighting": "Complete lighting setup with mood, sources, and technical details",
      "colorGrading": "Specific color palette (MUST BE IDENTICAL ACROSS ALL SCENES)",
      "audioScript": "VOICEOVER NARRATION - THIS IS FOR TEXT-TO-SPEECH (TTS) AUDIO GENERATION. CRITICAL FORMAT REQUIREMENTS: Use ellipsis (…) after EVERY 2-5 word phrase. Put each phrase on a NEW LINE. Add BLANK LINES between thought groups. This creates natural pauses for human-like narration. Example: 'As I sit here…\\nin the meadow…\\nthe world feels expansive…\\nand full of promise.\\n\\nThe mountains call to me…\\nwhispering secrets…\\nof adventures yet to come.' Each scene should have 2-4 short phrases based on duration (5 or 8 seconds)."
    }
  ]
}`;


    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 8000, // Increased to accommodate detailed 200-300 word prompts per scene
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    
    console.log('\\n=== RAW OPENAI RESPONSE ===');
    console.log(content);
    console.log('============================\\n');

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
      
      // Handle different response structures
      let scenes: CinematicScene[];
      if (Array.isArray(parsedResponse)) {
        scenes = parsedResponse;
      } else if (parsedResponse.scenes && Array.isArray(parsedResponse.scenes)) {
        scenes = parsedResponse.scenes;
      } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
        scenes = parsedResponse.data;
      } else {
        throw new Error('Invalid response structure from OpenAI');
      }

      // Validate and ensure each scene has required fields
      const validatedScenes: CinematicScene[] = scenes.map((scene: any, index: number) => ({
        sceneNumber: scene.sceneNumber || index + 1,
        title: scene.title || `Scene ${index + 1}`,
        duration: Math.min(scene.duration || 8, 8), // Ensure max 8 seconds
        visualDescription: scene.visualDescription || '',
        detailedPrompt: scene.detailedPrompt || scene.prompt || '',
        transitionIn: scene.transitionIn || 'Scene begins',
        transitionOut: scene.transitionOut || 'Scene ends',
        cameraWork: scene.cameraWork || scene.camera || '',
        lighting: scene.lighting || '',
        colorGrading: scene.colorGrading || scene.colorPalette || '',
        audioScript: scene.audioScript || scene.voiceover || scene.narration || ''
      }));

      // Post-process to enhance transition matching
      const enhancedScenes = await enhanceSceneTransitions(validatedScenes, client);

      console.log('\\n=== GENERATED SCENES ===');
      enhancedScenes.forEach(scene => {
        console.log(`Scene ${scene.sceneNumber}: ${scene.title} (${scene.duration}s)`);
        console.log(`Prompt: ${scene.detailedPrompt.substring(0, 100)}...`);
        console.log(`TransitionOut: ${scene.transitionOut}`);
      });
      console.log('========================\\n');

      return enhancedScenes;

    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Content:', content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

  } catch (error) {
    console.error('Error generating cinematic scenes with OpenAI:', error);
    throw error;
  }
};
