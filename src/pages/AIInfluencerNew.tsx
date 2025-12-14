import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TagInput } from '@/components/form/TagInput';
import { ColorInput } from '@/components/form/ColorInput';
import { toast } from 'sonner';
import { generateImage } from '@/utils/runpodService';
import { enhanceCharacterPrompt, enhanceEnvironmentPrompt } from '@/utils/openaiService';
import { composeImages } from '@/utils/imageCompositionService';
import { uploadImageToGCS, uploadAudioToGCS } from '@/utils/gcsUploader';
import { generateAudioFromText } from '@/utils/runpodTTSService';
import { buildCharacterPrompt, buildEnvironmentPrompt, CharacterFormValues, EnvironmentFormValues } from '@/utils/promptBuilder';
import { Loader2, User, Image as ImageIcon, Layers, CheckCircle2, Sparkles, ChevronRight, Mountain, Video, Mic, Upload, Download, RefreshCw, Film } from 'lucide-react';

type Step = 'character' | 'environment' | 'compose' | 'video-script';

// Default form values
const DEFAULT_CHARACTER: CharacterFormValues = {
  gender: "female",
  age: 25,
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
  makeup: 3,
  expression: "confident smile",
  hairstyle: "long wavy",
  hairColor: "#3b2e2e",
  hairLength: "long",
  accessories: [],
  height: 170,
  bodyType: "athletic",
  shoulders: "average",
  chest: "average",
  waist: "average",
  hips: "average",
  outfitStyle: "casual chic",
  outfitColors: [],
  footwear: "",
  pose: "standing confident",
  camera: "85mm portrait",
  framing: "medium",
  lighting: "soft natural",
  background: "neutral",
  quality: "standard",
  styleHints: [],
  negativePrompts: [],
  extraNotes: "",
};

const DEFAULT_ENVIRONMENT: EnvironmentFormValues = {
  location: "modern office",
  timeOfDay: "golden hour",
  weather: "clear",
  season: "summer",
  mood: "professional",
  era: "contemporary",
  subjectFocus: "center",
  camera: "wide angle",
  lighting: "natural soft",
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

export default function AIInfluencerNew() {
  const [currentStep, setCurrentStep] = useState<Step>('character');
  
  // Form data
  const [characterData, setCharacterData] = useState<CharacterFormValues>(DEFAULT_CHARACTER);
  const [environmentData, setEnvironmentData] = useState<EnvironmentFormValues>(DEFAULT_ENVIRONMENT);
  
  // Generated images
  const [characterImage, setCharacterImage] = useState<string>('');
  const [environmentImage, setEnvironmentImage] = useState<string>('');
  const [composedImage, setComposedImage] = useState<string>('');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  
  // Loading states
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [isGeneratingEnvironment, setIsGeneratingEnvironment] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [compositionStatus, setCompositionStatus] = useState('');
  
  // Video Script & Audio states
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [enhancedVideoPrompt, setEnhancedVideoPrompt] = useState<string>('');
  const [videoScript, setVideoScript] = useState<string>('');
  const [editedScript, setEditedScript] = useState<string>('');
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [customSpeakerUrl, setCustomSpeakerUrl] = useState<string>('');
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string>('');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  
  // Video generation states
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoStatus, setVideoStatus] = useState<string>('');
  
  // Step completion
  const [hasCharacter, setHasCharacter] = useState(false);
  const [hasEnvironment, setHasEnvironment] = useState(false);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔄 STATE CHANGED - characterImage:', characterImage ? `${characterImage.length} chars` : 'EMPTY');
  }, [characterImage]);

  useEffect(() => {
    console.log('🔄 STATE CHANGED - environmentImage:', environmentImage ? `${environmentImage.length} chars` : 'EMPTY');
  }, [environmentImage]);

  useEffect(() => {
    console.log('🔄 STATE CHANGED - currentStep:', currentStep);
    console.log('   📦 characterImage exists?', !!characterImage);
    console.log('   📦 environmentImage exists?', !!environmentImage);
  }, [currentStep]);

  const steps = [
    { id: 'character' as Step, label: 'Character', icon: User, completed: hasCharacter },
    { id: 'environment' as Step, label: 'Environment', icon: ImageIcon, completed: hasEnvironment },
    { id: 'compose' as Step, label: 'Compose', icon: Layers, completed: !!uploadedUrl },
    { id: 'video-script' as Step, label: 'Video Script', icon: Video, completed: !!audioUrl },
  ];

  // Generate Character
  const handleGenerateCharacter = async () => {
    setIsGeneratingCharacter(true);
    setCharacterImage('');
    
    try {
      toast.info('Enhancing character prompt...');
      const prompt = buildCharacterPrompt(characterData);
      const enhancedPrompt = await enhanceCharacterPrompt(characterData);
      
      toast.info('Generating character image...');
      const imageUrl = await generateImage(
        enhancedPrompt,
        (status) => console.log('Character generation:', status),
        1024,
        1024
      );
      
      console.log('✅ Character generated!');
      console.log('📸 Character base64 length:', imageUrl.length);
      console.log('🔗 Character data URL preview:', imageUrl.substring(0, 100) + '...');
      
      setCharacterImage(imageUrl);
      setHasCharacter(true);
      
      console.log('💾 Character stored in state! Length:', imageUrl.length);
      toast.success('Character Generated! ✨');
      
    } catch (error) {
      console.error('Character generation failed:', error);
      toast.error('Failed to generate character');
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  // Generate Environment
  const handleGenerateEnvironment = async () => {
    setIsGeneratingEnvironment(true);
    setEnvironmentImage('');
    
    try {
      toast.info('Enhancing environment prompt...');
      const prompt = buildEnvironmentPrompt(environmentData);
      const enhancedPrompt = await enhanceEnvironmentPrompt(environmentData);
      
      toast.info('Generating environment image...');
      const imageUrl = await generateImage(
        enhancedPrompt,
        (status) => console.log('Environment generation:', status),
        1920,
        1080
      );
      
      console.log('✅ Environment generated!');
      console.log('📸 Environment base64 length:', imageUrl.length);
      console.log('🔗 Environment data URL preview:', imageUrl.substring(0, 100) + '...');
      
      setEnvironmentImage(imageUrl);
      setHasEnvironment(true);
      
      console.log('💾 Environment stored in state! Length:', imageUrl.length);
      toast.success('Environment Generated! 🌄');
      
    } catch (error) {
      console.error('Environment generation failed:', error);
      toast.error('Failed to generate environment');
    } finally {
      setIsGeneratingEnvironment(false);
    }
  };

  // Compose and Upload
  const handleComposeAndUpload = async () => {
    if (!characterImage || !environmentImage) {
      toast.error('Generate both images first');
      return;
    }

    setIsComposing(true);
    setCompositionStatus('Composing...');

    try {
      console.log('📦 Retrieving stored images from state...');
      console.log('📸 Character image length:', characterImage.length);
      console.log('📸 Environment image length:', environmentImage.length);
      
      const charBase64 = characterImage.replace(/^data:image\/\w+;base64,/, '');
      const envBase64 = environmentImage.replace(/^data:image\/\w+;base64,/, '');

      console.log('🖼️ Starting composition...');
      console.log('📏 Character base64 (stripped):', charBase64.length);
      console.log('📏 Environment base64 (stripped):', envBase64.length);
      
      const composedBase64 = await composeImages(
        charBase64,
        envBase64,
        (status) => {
          console.log('Composition status:', status);
          setCompositionStatus(status);
        },
        5
      );

      const composedDataUrl = `data:image/png;base64,${composedBase64}`;
      setComposedImage(composedDataUrl);
      console.log('✅ Composition complete!');

      // Upload
      setCompositionStatus('Uploading...');
      toast.info('Uploading to cloud...');
      
      const url = await uploadImageToGCS(
        composedDataUrl,
        'ai-influencer.png',
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
          setCompositionStatus(`Uploading... ${progress}%`);
        }
      );

      setUploadedUrl(url);
      console.log('✅ Uploaded! URL:', url);
      toast.success('Image composed and uploaded! 🎉');
      
    } catch (error) {
      console.error('Compose/upload failed:', error);
      toast.error('Failed to compose or upload');
    } finally {
      setIsComposing(false);
      setCompositionStatus('');
    }
  };

  // Enhance video prompt and generate script
  const handleEnhancePrompt = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Please enter a video prompt');
      return;
    }

    setIsEnhancingPrompt(true);

    try {
      toast.info('Enhancing your video prompt...');
      
      // Call OpenAI to enhance the prompt and generate a script
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert video content creator for SHORT-FORM content. Your task is to:
1. Enhance the user's video idea into a detailed, engaging video prompt for a ${videoDuration}-second video
2. Create a VERY SHORT narration script (${videoDuration} seconds = approximately ${videoDuration === 5 ? '12-15' : '18-22'} words maximum)

CRITICAL SCRIPT REQUIREMENTS:
- The script MUST be short enough for ${videoDuration} seconds of speech
- NO greetings like "Hey there", "Hello", or "Hi everyone"
- Direct, impactful narration - get straight to the point
- The character is telling/narrating something, not chatting
- Natural, conversational but CONCISE

PAUSE & PACING RULES - THIS SCRIPT WILL BE READ BY TTS (TEXT-TO-SPEECH):
- Use "…" (ellipsis) after EVERY short phrase for natural breathing pauses
- Put each phrase on a NEW LINE for dramatic pacing
- Keep lines SHORT (2-5 words per line maximum)
- Add blank lines between thought groups for longer pauses
- This creates natural, human-like speech patterns for audio narration
- The TTS will interpret line breaks and ellipsis as pauses

REQUIRED FORMAT (follow this EXACT structure):
First phrase…
next phrase…
continuation…

New thought group…
with more lines…
each one short…

Final phrase…
to complete.

Example for 5 seconds (COPY THIS STYLE):
"This morning…
changed everything.

One decision…
and my whole world…
shifted."

Example for 8 seconds (COPY THIS STYLE):
"They say…
success happens overnight.

But nobody sees…
the thousand nights…
you spent working…
in silence…
building your dream."

The character is: ${characterData.gender}, ${characterData.age} years old, ${characterData.ethnicity}, with ${characterData.expression} expression, wearing ${characterData.outfitStyle}.
Setting: ${environmentData.location}, ${environmentData.timeOfDay}, ${environmentData.mood} mood.

Return your response in this exact JSON format:
{
  "enhancedPrompt": "Detailed cinematic video prompt that includes lip-sync requirements for ${videoDuration}-second duration",
  "script": "The SHORT narration script here - MUST use line breaks and ellipsis as shown in examples above"
}`
            },
            {
              role: 'user',
              content: `Video idea: ${videoPrompt}\nDuration: ${videoDuration} seconds`
            }
          ],
          temperature: 0.8
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setEnhancedVideoPrompt(parsed.enhancedPrompt);
        setVideoScript(parsed.script);
        setEditedScript(parsed.script);
        toast.success('Prompt enhanced & script generated!');
      } else {
        throw new Error('Failed to parse response');
      }

    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('Failed to enhance prompt');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Handle voice sample upload
  const handleVoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      event.target.value = '';
      return;
    }

    setIsUploadingVoice(true);

    try {
      toast.info(`Uploading ${file.name}...`);
      
      const url = await uploadAudioToGCS(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });

      setCustomSpeakerUrl(url);
      toast.success('Voice sample uploaded!');
      event.target.value = '';

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload voice sample');
      event.target.value = '';
    } finally {
      setIsUploadingVoice(false);
    }
  };

  // Generate audio from script
  const handleGenerateAudio = async () => {
    setShowScriptDialog(false);
    setIsGeneratingAudio(true);
    setAudioStatus('Generating audio...');

    try {
      toast.info('Generating audio with AI emotions...');

      const context = `Character: ${characterData.gender}, ${characterData.age} years old. Setting: ${environmentData.location}. Mood: ${environmentData.mood}.`;

      const audioDataUrl = await generateAudioFromText(
        editedScript,
        (status) => {
          console.log('TTS Status:', status);
          setAudioStatus(status);
          
          if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
            toast.info(`🔄 ${status}`, { duration: 2000 });
          }
        },
        customSpeakerUrl || undefined,
        context
      );

      setAudioUrl(audioDataUrl);
      setAudioStatus('Completed!');
      toast.success('Audio generated! 🎵');

    } catch (error) {
      console.error('Audio generation failed:', error);
      setAudioStatus('Failed');
      toast.error('Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Generate video from image, audio, and prompt
  const handleGenerateVideo = async () => {
    if (!uploadedUrl || !audioUrl || !enhancedVideoPrompt) {
      toast.error('Missing required data for video generation');
      console.error('❌ VIDEO GENERATION - Missing required data:', {
        uploadedUrl: !!uploadedUrl,
        audioUrl: !!audioUrl,
        enhancedVideoPrompt: !!enhancedVideoPrompt
      });
      return;
    }

    setIsGeneratingVideo(true);
    setVideoStatus('Submitting video generation job...');
    setVideoUrl('');

    console.log('🎬 VIDEO GENERATION STARTED');
    console.log('📋 Configuration:', {
      duration: videoDuration,
      imageUrl: uploadedUrl,
      audioUrl: audioUrl,
      promptLength: enhancedVideoPrompt.length
    });

    try {
      const API_KEY = import.meta.env.VITE_RUNPOD_API_KEY;
      const RUNPOD_ENDPOINT = "https://api.runpod.ai/v2/wan-2-5/run";

      // Prepare payload
      const payload = {
        input: {
          prompt: enhancedVideoPrompt,
          negative_prompt: "deformed face, distorted anatomy, asymmetrical facial features, mutated eyes, extra limbs, missing limbs, fused fingers, broken fingers, unnatural finger positions, disconnected body parts, melted skin, warped proportions, stretched limbs, shrunk limbs, twisted torso, misaligned joints, rubbery motion, jittery movement, unnatural motion blur, double exposure, ghosting artifacts, temporal flicker, frame flickering, inconsistent character appearance, inconsistent clothing, shifting colors between frames, texture swimming, mesh tearing, unstable textures, wobbling surfaces, morphing objects, background warping, background collapse, collapsing geometry, unstable environment, broken shadows, inaccurate reflections, floating objects, levitating items without cause, unnatural physics, no gravity, incorrect object interactions, clipping, intersection of body with clothes or environment, fabric clipping through skin, stiff animation, robotic movement, mannequin-like motion, uncanny valley face, dead eyes, incorrect eye gaze, crossed eyes, lazy eye, blinking desync, mouth not matching expression, teeth artifacts, corrupted mouth interior, tongue artifacts, unnatural lip-sync, audio mismatch, overexposed lighting, underexposed lighting, blown highlights, crushed shadows, flickering light, inconsistent lighting between frames, wrong light direction, noisy shadows, grainy image, high noise, excessive compression, pixelation, color banding, chromatic aberration, unnatural saturation, plastic skin, waxy skin, overly smooth textures, blur patches, smudged details, inaccurate depth of field, unnecessary depth blur, autofocus hunting, focus shifting, camera jitter, camera shake, unnatural zooming, sudden zooms, random pans, off-center framing, subject cutoff, cropping errors, stretched aspect ratio, looping errors, repeated frames, corrupted frames, broken animation transitions, inconsistent frame rate, glitch effects, green screen artifacts, haloing, edge glow, ringing artifacts, alpha matte errors, masking errors, duplicated characters, multiple faces glitch, partial face duplication, disappearing objects, popping objects, sudden object appearance, unnatural hair physics, hair flicker, hair clumping, low-resolution hair, clothing deformities, pattern distortion, garbled text, unreadable signs, mirrored text, random symbols, UI artifacts, video watermark, logo, signature, copyright text, subtitles, captions, NSFW, nudity, sexual content, blood, gore, violence, horror elements, scary distortions, self-harm, suicide, cutting, overdose, smiling, laughing, comedic tone, exaggerated cartoon crying, overacting",
          image: uploadedUrl,
          size: "1280*720",
          duration: videoDuration,
          seed: -1,
          enable_prompt_expansion: false,
          enable_safety_checker: true,
          audio: audioUrl
        }
      };

      console.log('📤 SUBMITTING TO RUNPOD:', RUNPOD_ENDPOINT);
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));

      // Submit job
      setVideoStatus('Submitting to RunPod...');
      const response = await fetch(RUNPOD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 SUBMISSION RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SUBMISSION FAILED:', errorText);
        throw new Error(`Failed to submit video generation job: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ SUBMISSION SUCCESS:', responseData);
      
      const jobId = responseData.id;

      if (!jobId) {
        console.error('❌ No job ID in response:', responseData);
        throw new Error('No job ID returned from RunPod');
      }

      console.log('🆔 JOB ID:', jobId);
      setVideoStatus(`Job submitted: ${jobId}`);
      toast.info(`Video generation started (Job: ${jobId.substring(0, 8)}...)`);

      // Poll for status
      const statusEndpoint = `https://api.runpod.ai/v2/wan-2-5/status/${jobId}`;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max (5 sec intervals)

      console.log('🔄 STARTING STATUS POLLING...');

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;

        setVideoStatus(`Generating video... (${attempts * 5}s elapsed)`);

        console.log(`🔍 STATUS CHECK #${attempts} (${attempts * 5}s elapsed)...`);

        const statusResponse = await fetch(statusEndpoint, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        });

        if (!statusResponse.ok) {
          console.error(`❌ Status check failed (attempt ${attempts}):`, statusResponse.statusText);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`📊 STATUS RESPONSE #${attempts}:`, JSON.stringify(statusData, null, 2));
        
        const status = statusData.status;
        console.log(`📈 Current Status: ${status}`);

        if (status === 'COMPLETED') {
          // Extract video URL from nested output.result structure
          const outputUrl = statusData.output?.result || statusData.output;
          console.log('✅ VIDEO COMPLETED!');
          console.log('🎥 Output object:', statusData.output);
          console.log('🎥 Video URL:', outputUrl);
          console.log('💰 Cost:', statusData.output?.cost);
          console.log('📊 Full response:', statusData);
          
          if (outputUrl && typeof outputUrl === 'string') {
            setVideoUrl(outputUrl);
            setVideoStatus('Completed!');
            toast.success('Video generated successfully! 🎬');
            console.log('🎉 VIDEO GENERATION SUCCESSFUL!');
            return;
          } else {
            console.error('❌ No valid output URL in completed response:', statusData);
            console.error('❌ Output structure:', statusData.output);
            throw new Error('Video completed but no valid output URL found');
          }
        } else if (status === 'FAILED') {
          console.error('❌ VIDEO GENERATION FAILED:', statusData);
          throw new Error(`Video generation failed: ${JSON.stringify(statusData)}`);
        }

        // Update status message
        if (status === 'IN_QUEUE') {
          setVideoStatus(`In queue... (${attempts * 5}s)`);
          console.log('⏳ Still in queue...');
        } else if (status === 'IN_PROGRESS') {
          setVideoStatus(`Generating video... (${attempts * 5}s)`);
          console.log('⚙️ Processing...');
        }
      }

      console.error('⏱️ TIMEOUT: Maximum polling attempts reached');
      throw new Error('Video generation timeout (10 minutes exceeded)');

    } catch (error) {
      console.error('❌ VIDEO GENERATION FAILED:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      setVideoStatus('Failed');
      toast.error(error instanceof Error ? error.message : 'Failed to generate video');
    } finally {
      setIsGeneratingVideo(false);
      console.log('🏁 VIDEO GENERATION PROCESS ENDED');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">AI Influencer Creator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create professional influencer content with AI
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : step.completed
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Step 1: Character */}
        {currentStep === 'character' && (
          <div className="space-y-4">
            {/* Debug: Show if character exists in state */}
            {(() => {
              console.log('🔍 CHARACTER STEP RENDERED');
              console.log('📦 characterImage in state:', characterImage ? `EXISTS (${characterImage.length} chars)` : 'EMPTY');
              console.log('✅ hasCharacter flag:', hasCharacter);
              return null;
            })()}
            
            {/* Show saved character if it exists */}
            {characterImage && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Character Already Generated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-md mx-auto">
                    <img src={characterImage} alt="Saved Character" className="w-full rounded border" />
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      Stored base64 length: {characterImage.length} characters
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Generate Character</CardTitle>
                <CardDescription className="text-xs">Detailed character settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Identity */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Gender</Label>
                      <Select value={characterData.gender} onValueChange={(v) => setCharacterData({...characterData, gender: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Age: {characterData.age}</Label>
                      <Slider
                        value={[characterData.age]}
                        onValueChange={(v) => setCharacterData({...characterData, age: v[0]})}
                        min={18}
                        max={70}
                        step={1}
                        className="py-1"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Ethnicity</Label>
                      <Input
                        placeholder="e.g., Asian, European"
                        value={characterData.ethnicity}
                        onChange={(e) => setCharacterData({...characterData, ethnicity: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Face */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Face</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Eye Color</Label>
                      <Select value={characterData.eyeColor} onValueChange={(v) => setCharacterData({...characterData, eyeColor: v})}>
                        <SelectTrigger className="h-8 text-xs">
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
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Eye Shape</Label>
                      <Select value={characterData.eyeShape} onValueChange={(v) => setCharacterData({...characterData, eyeShape: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="almond">Almond</SelectItem>
                          <SelectItem value="round">Round</SelectItem>
                          <SelectItem value="hooded">Hooded</SelectItem>
                          <SelectItem value="monolid">Monolid</SelectItem>
                          <SelectItem value="upturned">Upturned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Eyebrow Shape</Label>
                      <Select value={characterData.eyebrowShape} onValueChange={(v) => setCharacterData({...characterData, eyebrowShape: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="soft arch">Soft Arch</SelectItem>
                          <SelectItem value="straight">Straight</SelectItem>
                          <SelectItem value="angled">Angled</SelectItem>
                          <SelectItem value="thick">Thick</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Nose</Label>
                      <Select value={characterData.noseShape} onValueChange={(v) => setCharacterData({...characterData, noseShape: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="straight">Straight</SelectItem>
                          <SelectItem value="aquiline">Aquiline</SelectItem>
                          <SelectItem value="button">Button</SelectItem>
                          <SelectItem value="upturned">Upturned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Lips</Label>
                      <Select value={characterData.lips} onValueChange={(v) => setCharacterData({...characterData, lips: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thin">Thin</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                          <SelectItem value="cupid's bow">Cupid's Bow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Teeth</Label>
                      <Select value={characterData.teeth} onValueChange={(v) => setCharacterData({...characterData, teeth: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not visible">Not Visible</SelectItem>
                          <SelectItem value="visible">Visible</SelectItem>
                          <SelectItem value="braces">Braces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Facial Hair</Label>
                      <Select value={characterData.facialHair} onValueChange={(v) => setCharacterData({...characterData, facialHair: v})}>
                        <SelectTrigger className="h-8 text-xs">
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
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Undertone</Label>
                      <Select value={characterData.undertone} onValueChange={(v) => setCharacterData({...characterData, undertone: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cool">Cool</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Skin Color</Label>
                      <ColorInput
                        value={characterData.skinColor}
                        onChange={(v) => setCharacterData({...characterData, skinColor: v})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Makeup: {["None", "Light", "Moderate", "Heavy"][characterData.makeup]}</Label>
                      <Slider
                        value={[characterData.makeup]}
                        onValueChange={(v) => setCharacterData({...characterData, makeup: v[0]})}
                        min={0}
                        max={3}
                        step={1}
                        className="py-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Expression</Label>
                      <Input
                        placeholder="e.g., confident smile"
                        value={characterData.expression}
                        onChange={(e) => setCharacterData({...characterData, expression: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                      <Switch
                        checked={characterData.freckles}
                        onCheckedChange={(v) => setCharacterData({...characterData, freckles: v})}
                      />
                      <Label className="text-xs">Freckles</Label>
                    </div>
                  </div>
                </div>

                {/* Hair */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Hair</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Hairstyle</Label>
                      <Input
                        placeholder="e.g., long wavy, pixie cut"
                        value={characterData.hairstyle}
                        onChange={(e) => setCharacterData({...characterData, hairstyle: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Hair Color</Label>
                      <ColorInput
                        value={characterData.hairColor}
                        onChange={(v) => setCharacterData({...characterData, hairColor: v})}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Hair Length</Label>
                      <Select value={characterData.hairLength} onValueChange={(v) => setCharacterData({...characterData, hairLength: v})}>
                        <SelectTrigger className="h-8 text-xs">
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
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Accessories</Label>
                    <TagInput
                      value={characterData.accessories}
                      onChange={(v) => setCharacterData({...characterData, accessories: v})}
                      placeholder="glasses, earrings..."
                    />
                  </div>
                </div>

                {/* Body & Clothing */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Body & Clothing</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Height: {characterData.height}cm</Label>
                      <Slider
                        value={[characterData.height]}
                        onValueChange={(v) => setCharacterData({...characterData, height: v[0]})}
                        min={150}
                        max={200}
                        step={1}
                        className="py-1"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Body Type</Label>
                      <Select value={characterData.bodyType} onValueChange={(v) => setCharacterData({...characterData, bodyType: v})}>
                        <SelectTrigger className="h-8 text-xs">
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
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Outfit Style</Label>
                      <Input
                        placeholder="e.g., casual chic, business"
                        value={characterData.outfitStyle}
                        onChange={(e) => setCharacterData({...characterData, outfitStyle: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Outfit Colors</Label>
                    <TagInput
                      value={characterData.outfitColors}
                      onChange={(v) => setCharacterData({...characterData, outfitColors: v})}
                      placeholder="Add colors..."
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Shoulders</Label>
                      <Select value={characterData.shoulders} onValueChange={(v) => setCharacterData({...characterData, shoulders: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="narrow">Narrow</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="broad">Broad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Chest</Label>
                      <Select value={characterData.chest} onValueChange={(v) => setCharacterData({...characterData, chest: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Waist</Label>
                      <Select value={characterData.waist} onValueChange={(v) => setCharacterData({...characterData, waist: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="narrow">Narrow</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="wide">Wide</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Hips</Label>
                      <Select value={characterData.hips} onValueChange={(v) => setCharacterData({...characterData, hips: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="narrow">Narrow</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="wide">Wide</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Footwear</Label>
                    <Input
                      placeholder="e.g., sneakers, heels"
                      value={characterData.footwear}
                      onChange={(e) => setCharacterData({...characterData, footwear: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Pose & Scene */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Pose & Scene</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Pose</Label>
                      <Input
                        placeholder="e.g., standing confident"
                        value={characterData.pose}
                        onChange={(e) => setCharacterData({...characterData, pose: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Camera</Label>
                      <Select value={characterData.camera} onValueChange={(v) => setCharacterData({...characterData, camera: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="85mm portrait">85mm Portrait</SelectItem>
                          <SelectItem value="35mm street">35mm Street</SelectItem>
                          <SelectItem value="wide-angle">Wide-angle</SelectItem>
                          <SelectItem value="telephoto">Telephoto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Framing</Label>
                      <Select value={characterData.framing} onValueChange={(v) => setCharacterData({...characterData, framing: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="close-up">Close-up</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="full-body">Full-body</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Lighting</Label>
                      <Input
                        placeholder="e.g., soft natural"
                        value={characterData.lighting}
                        onChange={(e) => setCharacterData({...characterData, lighting: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Background</Label>
                      <Input
                        placeholder="e.g., neutral, gradient"
                        value={characterData.background}
                        onChange={(e) => setCharacterData({...characterData, background: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Style & Quality */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Style & Quality</h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Quality</Label>
                    <Select value={characterData.quality} onValueChange={(v) => setCharacterData({...characterData, quality: v})}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Style Hints</Label>
                    <TagInput
                      value={characterData.styleHints}
                      onChange={(v) => setCharacterData({...characterData, styleHints: v})}
                      placeholder="e.g., dramatic, elegant..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Negative Prompts</Label>
                    <TagInput
                      value={characterData.negativePrompts}
                      onChange={(v) => setCharacterData({...characterData, negativePrompts: v})}
                      placeholder="What to avoid..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Extra Notes</Label>
                    <Textarea
                      placeholder="Any additional details..."
                      value={characterData.extraNotes}
                      onChange={(e) => setCharacterData({...characterData, extraNotes: e.target.value})}
                      className="h-16 text-xs resize-none"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateCharacter}
                  disabled={isGeneratingCharacter}
                  className="w-full"
                  size="sm"
                >
                  {isGeneratingCharacter ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Character
                    </>
                  )}
                </Button>

                {/* Generated Image */}
                {characterImage && (
                  <div className="pt-2 space-y-2">
                    <div className="text-xs text-green-600 font-medium text-center">
                      ✅ Character Generated & Stored
                    </div>
                    <img
                      src={characterImage}
                      alt="Generated Character"
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      Base64 stored: {characterImage.length} characters
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Button */}
            {hasCharacter && (
              <div className="flex justify-center">
                <Button onClick={() => setCurrentStep('environment')} size="sm">
                  Next: Environment <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Environment */}
        {currentStep === 'environment' && (
          <div className="space-y-4">
            {/* Debug: Show state when environment step renders */}
            {(() => {
              console.log('🔍 ENVIRONMENT STEP RENDERED');
              console.log('📦 characterImage in state:', characterImage ? `EXISTS (${characterImage.length} chars)` : 'EMPTY');
              console.log('📦 environmentImage in state:', environmentImage ? `EXISTS (${environmentImage.length} chars)` : 'EMPTY');
              console.log('✅ hasCharacter:', hasCharacter);
              console.log('✅ hasEnvironment:', hasEnvironment);
              return null;
            })()}
            
            {/* Show stored character preview */}
            {characterImage && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Character Saved (Step 1)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-[200px] mx-auto">
                    <img src={characterImage} alt="Saved Character" className="w-full rounded border" />
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      Base64 length: {characterImage.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Generate Environment</CardTitle>
                <CardDescription className="text-xs">Detailed environment settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Scene Basics */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Scene Basics</h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Location *</Label>
                    <Input
                      placeholder="e.g., urban street, dense forest"
                      value={environmentData.location}
                      onChange={(e) => setEnvironmentData({...environmentData, location: e.target.value})}
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Time of Day</Label>
                      <Select value={environmentData.timeOfDay} onValueChange={(v) => setEnvironmentData({...environmentData, timeOfDay: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dawn">Dawn</SelectItem>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="noon">Noon</SelectItem>
                          <SelectItem value="golden-hour">Golden Hour</SelectItem>
                          <SelectItem value="blue-hour">Blue Hour</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Weather</Label>
                      <Select value={environmentData.weather} onValueChange={(v) => setEnvironmentData({...environmentData, weather: v})}>
                        <SelectTrigger className="h-8 text-xs">
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
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Season</Label>
                      <Select value={environmentData.season} onValueChange={(v) => setEnvironmentData({...environmentData, season: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spring">Spring</SelectItem>
                          <SelectItem value="summer">Summer</SelectItem>
                          <SelectItem value="autumn">Autumn</SelectItem>
                          <SelectItem value="winter">Winter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Quality</Label>
                      <Select value={environmentData.quality} onValueChange={(v) => setEnvironmentData({...environmentData, quality: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Mood</Label>
                      <Input
                        placeholder="e.g., serene, ominous, epic"
                        value={environmentData.mood}
                        onChange={(e) => setEnvironmentData({...environmentData, mood: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Era</Label>
                      <Input
                        placeholder="e.g., Victorian, 2080, medieval"
                        value={environmentData.era}
                        onChange={(e) => setEnvironmentData({...environmentData, era: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Composition */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Composition</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Camera</Label>
                      <Select value={environmentData.camera} onValueChange={(v) => setEnvironmentData({...environmentData, camera: v})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50mm">50mm</SelectItem>
                          <SelectItem value="85mm">85mm</SelectItem>
                          <SelectItem value="wide-angle">Wide Angle</SelectItem>
                          <SelectItem value="telephoto">Telephoto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Lighting</Label>
                      <Input
                        placeholder="e.g., soft natural, dramatic"
                        value={environmentData.lighting}
                        onChange={(e) => setEnvironmentData({...environmentData, lighting: e.target.value})}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Color Palette</Label>
                    <TagInput
                      value={environmentData.colorPalette}
                      onChange={(v) => setEnvironmentData({...environmentData, colorPalette: v})}
                      placeholder="Add colors..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Foreground Elements</Label>
                    <TagInput
                      value={environmentData.foregroundElements}
                      onChange={(v) => setEnvironmentData({...environmentData, foregroundElements: v})}
                      placeholder="e.g., flowers, rocks"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Midground Elements</Label>
                    <TagInput
                      value={environmentData.midgroundElements}
                      onChange={(v) => setEnvironmentData({...environmentData, midgroundElements: v})}
                      placeholder="e.g., path, creek"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Background Elements</Label>
                    <TagInput
                      value={environmentData.backgroundElements}
                      onChange={(v) => setEnvironmentData({...environmentData, backgroundElements: v})}
                      placeholder="e.g., mountains, city skyline"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Subject Focus</Label>
                    <Input
                      placeholder="e.g., ancient gate, market square"
                      value={environmentData.subjectFocus}
                      onChange={(e) => setEnvironmentData({...environmentData, subjectFocus: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">Style</h3>
                  <div className="space-y-1">
                    <Label className="text-xs">Realism</Label>
                    <Select value={environmentData.realism} onValueChange={(v) => setEnvironmentData({...environmentData, realism: v})}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photorealistic">Photorealistic</SelectItem>
                        <SelectItem value="stylized">Stylized</SelectItem>
                        <SelectItem value="illustrative">Illustrative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Style Lineage</Label>
                    <TagInput
                      value={environmentData.styleLineage}
                      onChange={(v) => setEnvironmentData({...environmentData, styleLineage: v})}
                      placeholder="e.g., ghibli, unreal engine"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Style Hints</Label>
                    <TagInput
                      value={environmentData.styleHints}
                      onChange={(v) => setEnvironmentData({...environmentData, styleHints: v})}
                      placeholder="e.g., cinematic, dreamy"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Negative Prompts</Label>
                    <TagInput
                      value={environmentData.negativePrompts}
                      onChange={(v) => setEnvironmentData({...environmentData, negativePrompts: v})}
                      placeholder="What to avoid..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Extra Notes</Label>
                    <Textarea
                      placeholder="Any additional details..."
                      value={environmentData.extraNotes}
                      onChange={(e) => setEnvironmentData({...environmentData, extraNotes: e.target.value})}
                      className="h-16 text-xs resize-none"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateEnvironment}
                  disabled={isGeneratingEnvironment || !environmentData.location}
                  className="w-full"
                  size="sm"
                >
                  {isGeneratingEnvironment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mountain className="mr-2 h-4 w-4" />
                      Generate Environment
                    </>
                  )}
                </Button>

                {/* Generated Image */}
                {environmentImage && (
                  <div className="pt-2 space-y-2">
                    <div className="text-xs text-green-600 font-medium text-center">
                      ✅ Environment Generated & Stored
                    </div>
                    <img
                      src={environmentImage}
                      alt="Generated Environment"
                      className="w-full max-w-2xl mx-auto rounded-lg border"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      Base64 stored: {environmentImage.length} characters
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep('character')} variant="outline" size="sm">
                Back
              </Button>
              {hasEnvironment && (
                <Button onClick={() => setCurrentStep('compose')} size="sm">
                  Next: Compose <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Compose */}
        {currentStep === 'compose' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Compose & Upload</CardTitle>
                <CardDescription className="text-sm">Combine and upload your images</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Character</Label>
                    {characterImage ? (
                      <img src={characterImage} alt="Character" className="w-full rounded border" />
                    ) : (
                      <div className="aspect-square bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No character
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Environment</Label>
                    {environmentImage ? (
                      <img src={environmentImage} alt="Environment" className="w-full rounded border" />
                    ) : (
                      <div className="aspect-square bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No environment
                      </div>
                    )}
                  </div>
                </div>

                {/* Compose Button */}
                <Button
                  onClick={handleComposeAndUpload}
                  disabled={isComposing || !characterImage || !environmentImage}
                  className="w-full"
                  size="sm"
                >
                  {isComposing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {compositionStatus}
                    </>
                  ) : (
                    <>
                      <Layers className="mr-2 h-4 w-4" />
                      Compose & Upload
                    </>
                  )}
                </Button>

                {/* Result */}
                {composedImage && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-semibold">Final Result</Label>
                    <img src={composedImage} alt="Composed" className="w-full max-w-2xl mx-auto rounded-lg border-2 border-primary" />
                    
                    {uploadedUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <Label className="text-xs font-medium">Uploaded!</Label>
                        </div>
                        <div className="flex gap-2">
                          <Input value={uploadedUrl} readOnly className="text-xs" />
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(uploadedUrl);
                              toast.success('Copied!');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep('environment')} variant="outline" size="sm">
                Back
              </Button>
              {uploadedUrl && (
                <Button onClick={() => setCurrentStep('video-script')} size="sm">
                  Next: Video Script <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Video Script */}
        {currentStep === 'video-script' && (
          <div className="space-y-4">
            {/* Show composed image preview */}
            {composedImage && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Image Ready (Previous Step)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xs mx-auto">
                    <img src={composedImage} alt="Composed" className="w-full rounded border" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <Video className="text-primary" size={24} />
                  <div>
                    <CardTitle className="text-xl">Video Script Generation</CardTitle>
                    <CardDescription className="text-sm">Create a short narrated video for your character</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Video Duration - FIRST */}
                <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Label htmlFor="video-duration-select" className="text-sm font-semibold flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-600" />
                    Video Duration (Select First)
                  </Label>
                  <Select
                    value={videoDuration.toString()}
                    onValueChange={(value) => setVideoDuration(Number(value))}
                  >
                    <SelectTrigger id="video-duration-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds (12-15 words)</SelectItem>
                      <SelectItem value="8">8 seconds (18-22 words)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-700">
                    ⚠️ Choose duration first - the script will be generated to fit this length
                  </p>
                </div>

                {/* Video Prompt Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Video Idea / Prompt</Label>
                  <Textarea
                    placeholder="Describe what you want the video to be about... (e.g., 'Introduce a new product', 'Share a motivational message', 'Explain a concept')"
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your video concept - we'll create a {videoDuration}-second script with proper narration
                  </p>
                </div>

                {/* Enhance Button */}
                {!enhancedVideoPrompt && (
                  <Button
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancingPrompt || !videoPrompt.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {isEnhancingPrompt ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enhancing & Creating Script...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Enhance Prompt & Generate Script
                      </>
                    )}
                  </Button>
                )}

                {/* Enhanced Prompt & Script Display */}
                {enhancedVideoPrompt && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-600">✓ Enhanced Video Prompt</Label>
                      <p className="text-sm">{enhancedVideoPrompt}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t">
                      <Label className="text-sm font-semibold text-blue-600">✓ Character Script (Narration)</Label>
                      <Textarea
                        value={videoScript}
                        readOnly
                        rows={6}
                        className="text-sm font-mono bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        {videoScript.length} characters · This script will be narrated by your character
                      </p>
                    </div>
                  </div>
                )}

                {/* Voice Sample Upload (only show after script is generated) */}
                {videoScript && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <Mic className="text-primary" size={20} />
                      <h3 className="text-base font-semibold">Audio Generation</h3>
                    </div>

                    {/* Voice Sample Section */}
                    <div className="p-4 border-2 border-dashed rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Voice Sample (Optional)</Label>
                        {customSpeakerUrl && (
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full font-medium">
                            ✓ Custom Voice Loaded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload a 3-10 second audio sample to clone your voice. Improves quality!
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={isUploadingVoice}
                          onClick={() => document.getElementById('voice-upload-influencer')?.click()}
                        >
                          {isUploadingVoice ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {customSpeakerUrl ? 'Change Voice' : 'Upload Voice'}
                            </>
                          )}
                        </Button>
                        {customSpeakerUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCustomSpeakerUrl('');
                              toast.info('Voice sample removed');
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <input
                        id="voice-upload-influencer"
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceUpload}
                        className="hidden"
                      />
                    </div>

                    {/* Script Review & Audio Generation */}
                    {!audioUrl ? (
                      <Button
                        onClick={() => {
                          setEditedScript(videoScript);
                          setShowScriptDialog(true);
                        }}
                        disabled={isGeneratingAudio}
                        className="w-full"
                        size="sm"
                      >
                        {isGeneratingAudio ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {audioStatus}
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Review Script & Generate Audio
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          Audio Generated!
                        </div>
                        
                        <audio src={audioUrl} controls className="w-full" />
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowScriptDialog(true)}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Regenerate Audio
                          </Button>
                          <Button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = audioUrl;
                              a.download = 'narration.mp3';
                              a.click();
                            }}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Generation Section */}
                {audioUrl && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <Film className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-lg">Step 3: Generate Video</h3>
                    </div>

                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>Duration:</strong> {videoDuration} seconds
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Video will be generated with your {videoDuration}-second audio narration
                      </p>
                    </div>

                    {/* Generate Video Button */}
                    {!videoUrl ? (
                      <Button
                        onClick={handleGenerateVideo}
                        disabled={isGeneratingVideo}
                        className="w-full"
                        size="lg"
                      >
                        {isGeneratingVideo ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {videoStatus}
                          </>
                        ) : (
                          <>
                            <Film className="mr-2 h-5 w-5" />
                            Generate Video
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          Video Generated!
                        </div>
                        
                        <video
                          src={videoUrl}
                          controls
                          className="w-full rounded-lg shadow-lg"
                          playsInline
                        >
                          Your browser does not support the video tag.
                        </video>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={handleGenerateVideo}
                            variant="outline"
                            className="flex-1"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Regenerate Video
                          </Button>
                          <Button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = videoUrl;
                              a.download = 'ai-influencer-video.mp4';
                              a.click();
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Status Indicator */}
                    {isGeneratingVideo && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Status:</strong> {videoStatus}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Video generation typically takes 2-5 minutes. Please wait...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Button onClick={() => setCurrentStep('compose')} variant="outline" size="sm">
              Back
            </Button>
          </div>
        )}
      </div>

      {/* Script Editing Dialog */}
      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Edit Script</DialogTitle>
            <DialogDescription>
              Edit the script before generating audio. This will be narrated by your character.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2">Script (Editable)</Label>
              <Textarea
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Edit your script here..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Characters: {editedScript.length}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScriptDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAudio}
              disabled={!editedScript.trim()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Audio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
