// Mock data for AI Storyboard Generator - Pure Demo (No API calls)

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  visualDescription: string;
  videoPrompt: string;
  duration: string;
  audioScript: string;
  audioTone: string;
}

export interface TonePreset {
  id: string;
  name: string;
  emoText: string;
}

export const TONE_PRESETS: TonePreset[] = [
  {
    id: 'calm-inspiring',
    name: 'Calm & Inspiring',
    emoText: 'calm, warm, softly inspiring, reflective narrator mood, gentle encouragement'
  },
  {
    id: 'adventurous-energetic',
    name: 'Adventurous & Energetic',
    emoText: 'energetic, excited, adventurous spirit, dynamic pacing, uplifting motivation'
  },
  {
    id: 'reflective-emotional',
    name: 'Reflective & Emotional',
    emoText: 'deeply reflective, emotional depth, introspective tone, thoughtful pauses, heartfelt'
  },
  {
    id: 'neutral-documentary',
    name: 'Neutral Documentary',
    emoText: 'neutral, clear, informative, professional narrator, steady documentary style'
  }
];

export const MOCK_SCENES: Scene[] = [
  {
    id: 'scene-1',
    sceneNumber: 1,
    title: 'Dawn on the Mountain Road',
    visualDescription: 'Golden sunrise light breaks through mountain peaks as a lone cyclist emerges from the morning mist, riding along a winding mountain road with dramatic valleys below.',
    videoPrompt: 'Cinematic 8k drone shot of a mountain bike traveler riding at sunrise, golden hour lighting, aerial view following the cyclist along a serpentine mountain road, misty valleys below, majestic peaks in background, warm amber and orange color grading, slow smooth camera movement, professional travel documentary style, volumetric light rays through morning fog',
    duration: '8-10s',
    audioScript: "Out here, before the world wakes, he finds his rhythm. Not in the chaos of the city, but in the quiet majesty of the mountains.",
    audioTone: 'calm, warm, softly inspiring, reflective narrator mood, gentle encouragement'
  },
  {
    id: 'scene-2',
    sceneNumber: 2,
    title: 'Flowing Through Mountain Curves',
    visualDescription: 'Dynamic low-angle tracking shot of the cyclist navigating smooth switchbacks, with sunlight filtering through pine trees and mountain landscape flowing past.',
    videoPrompt: 'Cinematic tracking shot at cyclist eye level, dynamic movement through mountain switchbacks, pine forest on both sides, dappled sunlight through trees, motion blur on background landscape, vibrant green and earth tones, stabilized smooth camera following the bike, shallow depth of field, adventure sports cinematography style, 8k quality',
    duration: '10-12s',
    audioScript: "Every curve is a meditation. Every climb, a conversation with himself. The bike isn't just transportation—it's his compass pointing toward clarity.",
    audioTone: 'calm, warm, softly inspiring, reflective narrator mood, gentle encouragement'
  },
  {
    id: 'scene-3',
    sceneNumber: 3,
    title: 'Quiet Break at the Viewpoint',
    visualDescription: 'Serene wide shot of the cyclist stopped at a mountain overlook, bike resting against a rock, taking in the vast panoramic vista of layered mountain ranges fading into the distance.',
    videoPrompt: 'Wide cinematic establishing shot of lone cyclist at mountain viewpoint, bike propped on rock, figure silhouetted against massive panoramic vista, layers of blue mountain ranges fading to horizon, late morning clear light, peaceful contemplative mood, ultra-wide angle lens, deep focus, National Geographic documentary style, 8k resolution, subtle color grading with cool blues and warm highlights',
    duration: '9-11s',
    audioScript: "In the stillness, he breathes deeper. The view stretches for miles, but what he's really seeing is perspective. Distance. Space to think.",
    audioTone: 'calm, warm, softly inspiring, reflective narrator mood, gentle encouragement'
  },
  {
    id: 'scene-4',
    sceneNumber: 4,
    title: 'Golden Hour Ride & Sunset',
    visualDescription: 'Magical sunset sequence with the cyclist riding into golden hour light, long shadows stretching across the mountain road, warm orange sky, silhouette against the setting sun.',
    videoPrompt: 'Cinematic golden hour shot from behind cyclist riding toward setting sun, long dramatic shadows on mountain road, warm orange and pink sunset sky, lens flare from sun on horizon, silhouette of rider and bike, dust particles visible in backlight, slow motion at 60fps, anamorphic lens aesthetic with horizontal flares, rich warm color palette, epic ending shot, 8k cinematic quality',
    duration: '10-12s',
    audioScript: "As the sun dips below the peaks, he's not thinking about the destination anymore. He's already there. Right here, in this moment, he's found what he came for.",
    audioTone: 'calm, warm, softly inspiring, reflective narrator mood, gentle encouragement'
  }
];

// Alternative scene variants for "regenerate" functionality
export const SCENE_VARIANTS: { [key: string]: Partial<Scene>[] } = {
  'scene-1': [
    {
      title: 'First Light Ascent',
      visualDescription: 'Pre-dawn darkness giving way to first light as cyclist climbs a steep mountain pass, stars still visible in the fading night sky.',
      videoPrompt: 'Cinematic time-lapse style shot transitioning from night to dawn, cyclist climbing steep mountain road, stars fading as sky brightens, dramatic color shift from deep blue to warm orange, wide establishing shot showing scale of mountain, professional landscape cinematography, 8k quality, smooth exposure blending',
      audioScript: "While most chase comfort in their beds, he chases horizons. Each pedal stroke carries him closer to something money can't buy—pure freedom."
    },
    {
      title: 'Mountain Road Awakening',
      visualDescription: 'Soft morning light illuminating a pristine mountain road as the cyclist rounds a bend, fresh dew glistening on pine needles.',
      videoPrompt: 'Cinematic side tracking shot of cyclist on mountain road at golden hour, fresh morning dew visible on vegetation, soft diffused sunlight, misty atmosphere, smooth camera dolly movement, shallow depth of field on cyclist, background naturally bokeh, warm pastel color grading, 8k resolution',
      audioScript: "The mountains don't judge. They don't demand. They simply exist—and in their presence, he remembers how to do the same."
    }
  ],
  'scene-2': [
    {
      title: 'Alpine Flow State',
      visualDescription: 'Fluid motion through alpine landscape, cyclist carving through turns with precision, mountain wildflowers blurring past.',
      videoPrompt: 'Dynamic POV and third-person mixed shots, cyclist smoothly navigating alpine curves, wildflowers in foreground blur, mountain peaks in background, gimbal stabilized fluid motion, vibrant natural colors, shallow focus on rider, cinematic sports documentary style, 8k 60fps for smooth motion',
      audioScript: "There's a flow state that happens here. Where thought becomes motion. Where the road and the rider become one continuous breath."
    },
    {
      title: 'Rhythm of the Road',
      visualDescription: 'Close-up details of the journey—spinning wheels, rhythmic pedaling, intercut with sweeping landscape passes.',
      videoPrompt: 'Cinematic montage sequence, close-ups of bike wheels and pedals, intercut with wide landscape shots, rhythmic editing pace, shallow depth of field on mechanical details, sweeping drone shots of mountain roads, dynamic shot variety, professional color grading with teal and orange, 8k quality',
      audioScript: "Pedal. Breathe. Repeat. In this simple rhythm, complexity falls away. What remains is pure, undistracted presence."
    }
  ],
  'scene-3': [
    {
      title: 'Summit Reflection',
      visualDescription: 'Cyclist at highest point of journey, overlooking a sea of clouds below, mountain peaks piercing through like islands.',
      videoPrompt: 'Epic wide cinematic shot from elevated position, cyclist on summit with sea of clouds below, mountain peaks emerging through cloud layer, dramatic scale showing tiny human against massive landscape, crisp morning light, deep blue sky, ultra-wide lens, stunning vista, 8k resolution, minimal color grading for natural beauty',
      audioScript: "Above the clouds, problems feel smaller. Worries dissolve. Up here, the only thing that matters is this: being alive, being present, being here."
    }
  ],
  'scene-4': [
    {
      title: 'Sunset Silhouette Journey',
      visualDescription: 'Dramatic silhouette of cyclist against vibrant sunset sky, descending mountain road with epic light show overhead.',
      videoPrompt: 'Cinematic silhouette shot from low angle, cyclist descending mountain road backlit by spectacular sunset, vibrant orange and purple sky, dramatic cloud formations, long shadows, anamorphic lens with characteristic flares, slow motion descent, rich warm color palette, epic scale, 8k cinematic quality',
      audioScript: "Every sunset is a promise. Tomorrow, there will be new roads. New mountains. New moments of perfect clarity waiting to be discovered."
    },
    {
      title: 'Journey\'s End, Journey\'s Beginning',
      visualDescription: 'Final shot of cyclist pausing to look back at the mountain road traveled, sunset painting everything in warm gold.',
      videoPrompt: 'Emotional cinematic shot over shoulder of cyclist looking back at winding mountain road, golden sunset light bathing entire scene, sense of accomplishment and reflection, gentle camera push-in, warm nostalgic color grading, shallow focus on rider\'s silhouette, contemplative ending shot, 8k quality, subtle vignette',
      audioScript: "The journey never really ends. It just pauses, waiting for the next sunrise, the next road, the next chance to remember what it means to truly live."
    }
  ]
};

export const DURATION_OPTIONS = [
  { value: '30', label: '30 seconds' },
  { value: '40-50', label: '40-50 seconds' },
  { value: '60', label: '60 seconds' }
];

export const SCENE_COUNT_OPTIONS = [
  { value: 3, label: '3 scenes' },
  { value: 4, label: '4 scenes' },
  { value: 5, label: '5 scenes' }
];

// Mock 5-scene storyboard
export const MOCK_SCENES_5: Scene[] = [
  ...MOCK_SCENES,
  {
    id: 'scene-5',
    sceneNumber: 5,
    title: 'Return to the Valley',
    visualDescription: 'Peaceful descent back into civilization, cyclist winding down mountain toward distant valley lights twinkling in twilight.',
    videoPrompt: 'Cinematic aerial drone shot pulling back and up, revealing cyclist descending mountain road toward valley with small town lights beginning to glow in twilight, transition from warm sunset to cool blue hour, sweeping camera movement, sense of journey completion, wide vista showing full mountain range, 8k quality, smooth color temperature shift',
    duration: '8-10s',
    audioScript: "He returns different than he left. Not because the mountains changed him, but because they reminded him of who he's always been.",
    audioTone: 'calm, warm, softly inspiring, reflective narrator mood, gentle encouragement'
  }
];

// Mock 3-scene storyboard
export const MOCK_SCENES_3: Scene[] = [
  MOCK_SCENES[0],
  MOCK_SCENES[1],
  MOCK_SCENES[3]
];
