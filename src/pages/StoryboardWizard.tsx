import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Video, Mic, Download, Play, Trash2, Copy, RefreshCw, ChevronRight, ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateCinematicScenes, CinematicScene } from '@/utils/openaiService';
import { downloadAndCombineVideos, mergeVideoWithAudio } from '@/utils/videoCombiner';
import { submitTextToVideoJob, checkVideoJobStatus } from '@/utils/runpodVideoService';
import { generateAudioFromText } from '@/utils/runpodTTSService';
import { uploadAudioToGCS } from '@/utils/gcsUploader';
import {
  TONE_PRESETS,
  DURATION_OPTIONS,
  SCENE_COUNT_OPTIONS,
} from '@/data/mockStoryboard';

// Preset voice samples
type Step = 'idea' | 'storyboard' | 'video-generation' | 'audio' | 'final';

type VideoStatus = 'pending' | 'generating' | 'completed' | 'failed';

// Scene interface matching our needs
interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  duration: number; // in seconds
  visualDescription: string;
  detailedPrompt: string;
  transitionIn: string;
  transitionOut: string;
  cameraWork: string;
  lighting: string;
  colorGrading: string;
  audioScript: string;
  audioTone: string;
  videoStatus?: VideoStatus;
  videoUrl?: string;
  videoJobId?: string;
  videoError?: string;
}

interface ProjectSettings {
  videoIdea: string;
  duration: string;
  sceneCount: number;
  voiceoverTone: string;
}

export default function StoryboardWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('idea');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string>('');
  const [isCombining, setIsCombining] = useState(false);
  const [testingMode, setTestingMode] = useState(false);
  
  // Audio generation states
  const [audioScript, setAudioScript] = useState<string>('');
  const [editedAudioScript, setEditedAudioScript] = useState<string>('');
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioStatus, setAudioStatus] = useState<string>('');
  
  // Voice sample states
  const [customSpeakerUrl, setCustomSpeakerUrl] = useState<string>('');
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  
  // Final video with audio
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>('');
  const [isMergingFinal, setIsMergingFinal] = useState(false);
  
  const [settings, setSettings] = useState<ProjectSettings>({
    videoIdea: 'A passionate bike traveler finding calm in the mountains at sunrise and sunset.',
    duration: '40-50',
    sceneCount: 4,
    voiceoverTone: 'calm-inspiring'
  });

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'idea', label: 'Idea', icon: Sparkles },
    { id: 'storyboard', label: 'Storyboard', icon: Video },
    { id: 'video-generation', label: 'Generate Videos', icon: Play },
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'final', label: 'Final', icon: Download }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleGenerateStoryboard = async () => {
    setIsGenerating(true);
    
    try {
      // Parse duration to get target seconds
      let targetSeconds = 40;
      if (settings.duration === '30') targetSeconds = 30;
      else if (settings.duration === '60') targetSeconds = 60;
      else if (settings.duration.includes('-')) {
        const parts = settings.duration.split('-');
        targetSeconds = parseInt(parts[1]) || 40;
      }

      // Get selected tone preset
      const selectedTone = TONE_PRESETS.find(t => t.id === settings.voiceoverTone);
      const toneName = selectedTone?.name || 'Calm & Inspiring';

      // Generate scenes using OpenAI
      const generatedScenes = await generateCinematicScenes(
        settings.videoIdea,
        targetSeconds,
        toneName,
        testingMode // Pass testing mode flag
      );

      // Convert to our Scene format with IDs and audio tone
      const scenesWithMetadata: Scene[] = generatedScenes.map((scene, index) => ({
        id: `scene-${Date.now()}-${index}`,
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        duration: scene.duration,
        visualDescription: scene.visualDescription,
        detailedPrompt: scene.detailedPrompt,
        transitionIn: scene.transitionIn,
        transitionOut: scene.transitionOut,
        cameraWork: scene.cameraWork,
        lighting: scene.lighting,
        colorGrading: scene.colorGrading,
        audioScript: scene.audioScript || '',
        audioTone: selectedTone?.emoText || 'calm, warm, softly inspiring, reflective narrator mood',
        videoStatus: 'pending',
        videoUrl: undefined,
        videoJobId: undefined
      }));

      setScenes(scenesWithMetadata);
      setIsGenerating(false);
      setCurrentStep('storyboard');
      
      toast.success("Storyboard Generated! 🎬", {
        description: `Created ${generatedScenes.length} cinematic scenes with AI for ~${targetSeconds}s video.`,
      });
    } catch (error) {
      setIsGenerating(false);
      console.error('Error generating storyboard:', error);
      toast.error("Generation Failed", {
        description: error instanceof Error ? error.message : "Failed to generate storyboard. Please check your API key.",
      });
    }
  };

  const handleRegenerateScene = async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    try {
      const currentScene = scenes[sceneIndex];
      
      // Generate a single replacement scene using OpenAI
      toast.info("Regenerating scene with AI... ✨");
      
      const regeneratedScenes = await generateCinematicScenes(
        `Regenerate this scene with a different approach: ${currentScene.title}. Context: ${currentScene.visualDescription}`,
        currentScene.duration,
        TONE_PRESETS.find(t => t.id === settings.voiceoverTone)?.name || 'Calm & Inspiring'
      );

      if (regeneratedScenes && regeneratedScenes.length > 0) {
        const newSceneData = regeneratedScenes[0];
        const updatedScenes = [...scenes];
        updatedScenes[sceneIndex] = {
          id: currentScene.id,
          sceneNumber: currentScene.sceneNumber,
          title: newSceneData.title,
          duration: newSceneData.duration,
          visualDescription: newSceneData.visualDescription,
          detailedPrompt: newSceneData.detailedPrompt,
          transitionIn: newSceneData.transitionIn,
          transitionOut: newSceneData.transitionOut,
          cameraWork: newSceneData.cameraWork,
          lighting: newSceneData.lighting,
          colorGrading: newSceneData.colorGrading,
          audioScript: newSceneData.audioScript || currentScene.audioScript,
          audioTone: currentScene.audioTone,
          videoStatus: currentScene.videoStatus,
          videoUrl: currentScene.videoUrl,
          videoJobId: currentScene.videoJobId,
          videoError: currentScene.videoError
        };
        
        setScenes(updatedScenes);
        toast.success("Scene Regenerated! 🔄", {
          description: "New variant created with AI.",
        });
      }
    } catch (error) {
      console.error('Error regenerating scene:', error);
      toast.error("Regeneration Failed", {
        description: "Could not regenerate scene. Please try again.",
      });
    }
  };

  const handleDuplicateScene = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const newScene: Scene = {
      ...scene,
      id: `${scene.id}-copy-${Date.now()}`,
      sceneNumber: scenes.length + 1,
      title: `${scene.title} (Copy)`
    };

    setScenes([...scenes, newScene]);
    toast.success("Scene Duplicated 📋", {
      description: "Scene copied successfully.",
    });
  };

  const handleDeleteScene = (sceneId: string) => {
    const updatedScenes = scenes.filter(s => s.id !== sceneId);
    // Renumber scenes
    const renumbered = updatedScenes.map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1
    }));
    setScenes(renumbered);
    
    toast.success("Scene Deleted 🗑️", {
      description: "Scene removed from storyboard.",
    });
  };

  const handleUpdateScene = (sceneId: string, field: keyof Scene, value: string) => {
    setScenes(scenes.map(scene => 
      scene.id === sceneId ? { ...scene, [field]: value } : scene
    ));
  };

  const handleTonePresetChange = (sceneId: string, presetId: string) => {
    const preset = TONE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      handleUpdateScene(sceneId, 'audioTone', preset.emoText);
    }
  };

  const handleRegenerateScript = (sceneId: string) => {
    const alternateScripts = [
      "In these mountains, time moves differently. Each moment stretches, deepens, becomes something worth remembering.",
      "The road ahead is uncertain, but that's exactly the point. Out here, uncertainty becomes adventure.",
      "Some search for meaning in books. He finds it in the space between heartbeats, pedaling through ancient peaks."
    ];
    
    const randomScript = alternateScripts[Math.floor(Math.random() * alternateScripts.length)];
    handleUpdateScene(sceneId, 'audioScript', randomScript);
    
    toast.success("Script Regenerated! 📝", {
      description: "New voiceover text loaded.",
    });
  };

  const getTotalDuration = () => {
    let total = 0;
    scenes.forEach(scene => {
      total += scene.duration; // duration is now a number
    });
    return Math.round(total);
  };

  // Video generation functions
  const handleGenerateAllVideos = async () => {
    if (scenes.length === 0) return;

    // Initialize all scenes as generating
    const updatedScenes = scenes.map(scene => ({
      ...scene,
      videoStatus: 'generating' as VideoStatus
    }));
    setScenes(updatedScenes);

    toast.info("Starting video generation for all scenes... 🎬", {
      description: `Generating ${scenes.length} videos. This may take a few minutes.`
    });

    // Generate videos for each scene
    for (let i = 0; i < scenes.length; i++) {
      try {
        await generateSceneVideo(scenes[i].id);
      } catch (error) {
        console.error(`Error generating video for scene ${i + 1}:`, error);
      }
    }
  };

  const generateSceneVideo = async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    const scene = scenes[sceneIndex];

    try {
      // Update status to generating
      updateSceneVideoStatus(sceneId, 'generating');

      // RunPod API only allows 5 or 8 seconds - snap to nearest allowed value
      const videoDuration = scene.duration <= 6.5 ? 5 : 8;

      // Enhance prompt with transition information for smooth scene flow
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);
      let enhancedPrompt = scene.detailedPrompt;

      // Add transition context to prompt
      const transitionContext: string[] = [];
      
      // Add "how to start" (transitionIn)
      if (scene.transitionIn && scene.transitionIn !== 'Scene begins') {
        transitionContext.push(`[START: ${scene.transitionIn}]`);
      }
      
      // Add "how to end" (transitionOut)
      if (scene.transitionOut && scene.transitionOut !== 'Scene ends') {
        transitionContext.push(`[END: ${scene.transitionOut}]`);
      }

      // Prepend transition context to detailed prompt
      if (transitionContext.length > 0) {
        enhancedPrompt = transitionContext.join(' ') + ' ' + scene.detailedPrompt;
        console.log(`🎬 Scene ${scene.sceneNumber} with transitions:`, enhancedPrompt.substring(0, 200) + '...');
      }

      // Generate video using RunPod WAN 2.2 T2V 720p API (submit job)
      const jobId = await submitTextToVideoJob(
        enhancedPrompt,         // Now includes transition context
        videoDuration,           // duration in seconds (5 or 8 only)
        "1280*720",             // size
        30,                     // num_inference_steps (quality)
        5,                      // guidance (prompt adherence)
        -1,                     // seed (-1 for random)
        undefined,              // negative_prompt
        true,                   // enable_safety_checker
        false                   // enable_prompt_optimization
      );

      // Update scene with job ID
      setScenes(prev => prev.map(s => 
        s.id === sceneId ? { ...s, videoJobId: jobId } : s
      ));

      // Poll for completion
      pollVideoStatus(sceneId, jobId);

    } catch (error) {
      console.error('Error generating video:', error);
      updateSceneVideoStatus(sceneId, 'failed', undefined, 
        error instanceof Error ? error.message : 'Failed to generate video');
      
      toast.error(`Scene ${scene.sceneNumber} Failed`, {
        description: "Video generation failed. You can retry later."
      });
    }
  };

  const pollVideoStatus = async (sceneId: string, jobId: string) => {
    const checkStatus = async () => {
      try {
        const status = await checkVideoJobStatus(jobId);

        if (status.status === 'COMPLETED') {
          // Video URL can be in output.result or output.video_url
          const videoUrl = status.output?.result || status.output?.video_url;
          
          if (videoUrl) {
            // Video is ready
            updateSceneVideoStatus(sceneId, 'completed', videoUrl);
            
            const scene = scenes.find(s => s.id === sceneId);
            toast.success(`Scene ${scene?.sceneNumber || ''} Complete! ✅`, {
              description: "Video generated successfully."
            });
            
            return;
          } else {
            throw new Error('Job completed but no video URL found in response');
          }
        } else if (status.status === 'FAILED') {
          const errorMsg = status.error || 'Video generation failed on server';
          throw new Error(errorMsg);
        } else {
          // Still processing, check again in 5 seconds
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        updateSceneVideoStatus(sceneId, 'failed', undefined,
          error instanceof Error ? error.message : 'Status check failed');
        
        const scene = scenes.find(s => s.id === sceneId);
        toast.error(`Scene ${scene?.sceneNumber || ''} Failed`, {
          description: "Could not complete video generation."
        });
      }
    };

    // Start polling
    setTimeout(checkStatus, 5000);
  };

  const updateSceneVideoStatus = (
    sceneId: string, 
    status: VideoStatus, 
    url?: string, 
    error?: string
  ) => {
    setScenes(prev => prev.map(s => 
      s.id === sceneId 
        ? { 
            ...s, 
            videoStatus: status,
            videoUrl: url || s.videoUrl,
            videoError: error
          } 
        : s
    ));
  };

  const handleRegenerateSceneVideo = async (sceneId: string) => {
    await generateSceneVideo(sceneId);
  };

  const allVideosCompleted = () => {
    return scenes.length > 0 && scenes.every(s => s.videoStatus === 'completed');
  };

  const getVideoGenerationProgress = () => {
    const completed = scenes.filter(s => s.videoStatus === 'completed').length;
    return { completed, total: scenes.length };
  };

  const handleCombineVideos = async () => {
    if (!allVideosCompleted()) {
      toast.error("Not Ready", {
        description: "Please wait for all videos to complete first."
      });
      return;
    }

    setIsCombining(true);
    
    try {
      const sceneUrls = scenes
        .sort((a, b) => a.sceneNumber - b.sceneNumber)
        .map(s => ({
          sceneNumber: s.sceneNumber,
          url: s.videoUrl!
        }));

      toast.info("Combining Videos... 🎬", {
        description: `Downloading and combining ${sceneUrls.length} scene videos. This may take 1-2 minutes.`,
        duration: 5000
      });

      const combinedUrl = await downloadAndCombineVideos(
        sceneUrls,
        (stage, completed, total) => {
          if (stage === 'downloading' && completed !== undefined && total !== undefined) {
            toast.info(`📥 Downloading ${completed}/${total} videos...`, {
              duration: 2000
            });
          } else if (stage === 'combining') {
            toast.info("🔧 Loading FFmpeg (~30MB, first time only)...", {
              description: "Please wait, this may take 30-60 seconds",
              duration: 10000
            });
          }
        }
      );

      setCombinedVideoUrl(combinedUrl);
      setIsCombining(false);
      
      toast.success("Videos Combined! ✨", {
        description: "Your complete video is ready to watch!"
      });

    } catch (error) {
      setIsCombining(false);
      console.error('Error combining videos:', error);
      toast.error("Combination Failed", {
        description: error instanceof Error ? error.message : "Failed to combine videos."
      });
    }
  };

  // Combine all scene audio scripts into one
  const getCombinedAudioScript = () => {
    return scenes
      .sort((a, b) => a.sceneNumber - b.sceneNumber)
      .map(scene => scene.audioScript)
      .join(' ');
  };

  // Show script dialog for editing
  const handlePrepareAudio = () => {
    const combinedScript = getCombinedAudioScript();
    setAudioScript(combinedScript);
    setEditedAudioScript(combinedScript);
    setShowScriptDialog(true);
  };

  // Handle voice sample upload
  const handleVoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error("Invalid File", {
        description: "Please upload an audio file (MP3, WAV, etc.)"
      });
      // Clear input so user can try again
      event.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too Large", {
        description: "Audio file must be under 10MB"
      });
      // Clear input so user can try again
      event.target.value = '';
      return;
    }

    setIsUploadingVoice(true);

    try {
      toast.info("Uploading Voice Sample... 🎤", {
        description: `Uploading ${file.name} to cloud storage...`,
        duration: 5000
      });

      const url = await uploadAudioToGCS(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });

      setCustomSpeakerUrl(url);
      setIsUploadingVoice(false);

      toast.success("Voice Sample Uploaded! ✅", {
        description: "Your custom voice will be used for audio generation."
      });

      // Clear input after successful upload
      event.target.value = '';

    } catch (error) {
      setIsUploadingVoice(false);
      console.error('Error uploading voice:', error);
      toast.error("Upload Failed", {
        description: error instanceof Error ? error.message : "Failed to upload voice sample. Please try again."
      });
      // Clear input so user can retry
      event.target.value = '';
    }
  };

  // Generate audio from edited script
  const handleGenerateAudio = async () => {
    setShowScriptDialog(false);
    setIsGeneratingAudio(true);
    setAudioStatus('Analyzing emotions with AI...');

    try {
      toast.info("Generating Audio with AI Emotions... 🎤🎭", {
        description: customSpeakerUrl 
          ? "Using your custom voice with AI-generated emotion analysis" 
          : "Using default voice with AI emotions. Upload a custom sample for better results.",
        duration: 5000
      });

      // Create scene context from all scenes for emotion analysis
      const sceneContext = scenes.map(scene => 
        `Scene ${scene.sceneNumber}: ${scene.visualDescription} - ${scene.audioScript}`
      ).join('\n');

      const audioUrl = await generateAudioFromText(
        editedAudioScript,
        (status) => {
          console.log('TTS Status:', status);
          setAudioStatus(status);
          
          if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
            toast.info(`🔄 ${status}`, {
              description: "Please wait while audio is being generated...",
              duration: 2000
            });
          }
        },
        customSpeakerUrl || undefined, // Pass custom speaker URL if available
        sceneContext // Pass scene context for emotion analysis
      );

      setAudioUrl(audioUrl);
      setIsGeneratingAudio(false);
      setAudioStatus('Completed!');
      
      toast.success("Audio Generated! 🎵", {
        description: "Your voiceover with AI-generated emotions is ready!"
      });

    } catch (error) {
      setIsGeneratingAudio(false);
      setAudioStatus('Failed');
      console.error('Error generating audio:', error);
      toast.error("Audio Generation Failed", {
        description: error instanceof Error ? error.message : "Failed to generate audio."
      });
    }
  };

  // Merge video with audio to create final output
  const handleMergeFinalVideo = async () => {
    if (!combinedVideoUrl || !audioUrl) {
      toast.error("Missing Assets", {
        description: "Both video and audio must be ready before merging."
      });
      return;
    }

    setIsMergingFinal(true);

    try {
      toast.info("Merging Video & Audio... 🎬", {
        description: "Combining your video with voiceover. This may take 1-2 minutes.",
        duration: 5000
      });

      const finalUrl = await mergeVideoWithAudio(
        combinedVideoUrl,
        audioUrl,
        (message) => {
          console.log('Merge status:', message);
          toast.info(message, { duration: 2000 });
        }
      );

      setFinalVideoUrl(finalUrl);
      setIsMergingFinal(false);

      toast.success("Final Video Ready! 🎉", {
        description: "Your complete video with audio is ready!"
      });

    } catch (error) {
      setIsMergingFinal(false);
      console.error('Error merging final video:', error);
      toast.error("Merge Failed", {
        description: error instanceof Error ? error.message : "Failed to merge video with audio."
      });
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = index < currentStepIndex;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : isCompleted
                  ? 'bg-primary/20 text-primary'
                  : 'bg-card/50 text-muted-foreground'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className={`mx-2 ${isCompleted ? 'text-primary' : 'text-border'}`} size={20} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderIdeaStep = () => (
    <div className="max-w-3xl mx-auto">
      <Card>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary rounded-lg">
              <Sparkles className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Your Vision</h2>
              <p className="text-muted-foreground">Describe your cinematic journey</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="videoIdea" className="mb-2">Video Idea / Concept</Label>
              <Textarea
                id="videoIdea"
                value={settings.videoIdea}
                onChange={(e) => setSettings({ ...settings, videoIdea: e.target.value })}
                placeholder="A passionate bike traveler finding calm in the mountains at sunrise and sunset."
                className="min-h-32"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration" className="mb-2">Target Duration</Label>
                <Select value={settings.duration} onValueChange={(v) => setSettings({ ...settings, duration: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sceneCount" className="mb-2">Number of Scenes</Label>
                <Select value={settings.sceneCount.toString()} onValueChange={(v) => setSettings({ ...settings, sceneCount: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENE_COUNT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tone" className="mb-2">Voiceover Tone</Label>
                <Select value={settings.voiceoverTone} onValueChange={(v) => setSettings({ ...settings, voiceoverTone: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_PRESETS.map(preset => (
                      <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <input
                type="checkbox"
                id="testingMode"
                checked={testingMode}
                onChange={(e) => setTestingMode(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <Label htmlFor="testingMode" className="text-sm font-medium cursor-pointer">
                🧪 Testing Mode (Generate only 2 scenes to save credits)
              </Label>
            </div>

            <Button
              onClick={handleGenerateStoryboard}
              disabled={isGenerating}
              className="w-full py-6 text-lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 animate-spin" size={20} />
                  Generating Storyboard...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={20} />
                  Generate Storyboard (Demo)
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderStoryboardStep = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Your Cinematic Storyboard</h2>
        <p className="text-muted-foreground">Edit and refine each scene</p>
      </div>

      {scenes.map((scene) => (
        <Card key={scene.id}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-primary rounded-full text-primary-foreground text-sm font-semibold">
                    Scene {scene.sceneNumber}
                  </span>
                  <h3 className="text-xl font-bold">{scene.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{scene.visualDescription}</p>
                <p className="text-primary text-sm mt-1">⏱️ {scene.duration}s</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRegenerateScene(scene.id)}
                >
                  <RefreshCw size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicateScene(scene.id)}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteScene(scene.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Label className="mb-2">Detailed Video Prompt (editable)</Label>
              <Textarea
                value={scene.detailedPrompt}
                onChange={(e) => handleUpdateScene(scene.id, 'detailedPrompt', e.target.value)}
                className="min-h-28 font-mono text-sm"
              />
            </div>

            {/* Additional Scene Details */}
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label className="text-xs text-muted-foreground">Camera Work</Label>
                <p className="text-sm mt-1">{scene.cameraWork}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lighting</Label>
                <p className="text-sm mt-1">{scene.lighting}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Color Grading</Label>
                <p className="text-sm mt-1">{scene.colorGrading}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <div className="flex justify-between pt-6">
        <Button
          onClick={() => setCurrentStep('idea')}
          variant="outline"
        >
          <ChevronLeft className="mr-2" size={18} />
          Back to Idea
        </Button>
        <Button
          onClick={() => setCurrentStep('video-generation')}
        >
          Next: Generate Videos
          <ChevronRight className="ml-2" size={18} />
        </Button>
      </div>
    </div>
  );

  const renderAudioStep = () => {
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Audio & Voiceover</h2>
          <p className="text-muted-foreground">Generate a single voiceover for the entire video</p>
        </div>

        {/* Audio Generation Card */}
        <Card className="border-2">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mic className="text-primary" size={24} />
              <h3 className="text-xl font-bold">Voiceover Generation</h3>
            </div>
            
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-6 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                  <p className="text-2xl font-bold">{totalDuration}s</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scenes</p>
                  <p className="text-2xl font-bold">{scenes.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Script Length</p>
                  <p className="text-2xl font-bold">{getCombinedAudioScript().length} chars</p>
                </div>
              </div>

              {/* Voice Sample Section */}
              <div className="p-4 border-2 border-dashed rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Voice Sample (Optional)</Label>
                  {customSpeakerUrl && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full font-medium">
                      ✓ Custom Voice Loaded
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload an audio sample (3-10 seconds) to clone your voice. Improves quality!
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isUploadingVoice}
                    onClick={() => document.getElementById('voice-upload-input')?.click()}
                  >
                    {isUploadingVoice ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
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
                        toast.info("Voice sample removed", {
                          description: "Default voice will be used"
                        });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="voice-upload-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleVoiceUpload}
                  className="hidden"
                  />
                </div>
              </div>

              {/* Preview Script */}
              <div>
                <Label className="mb-2">Combined Script Preview</Label>
                <Textarea
                  value={getCombinedAudioScript()}
                  readOnly
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ℹ️ This is the combined script from all scenes. Click "Review & Edit Script" to make changes before generating audio.
                </p>
              </div>

              {/* Action Buttons */}
              {!audioUrl && (
                <div className="flex gap-3">
                  <Button
                    onClick={handlePrepareAudio}
                    disabled={isGeneratingAudio || scenes.length === 0}
                    className="flex-1"
                    size="lg"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {audioStatus}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Review & Edit Script
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Generated Audio Player */}
              {audioUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <Check size={24} />
                    <span className="font-semibold text-lg">Audio Generated!</span>
                  </div>
                  
                  <audio
                    src={audioUrl}
                    controls
                    className="w-full"
                  />
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handlePrepareAudio}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Audio
                    </Button>
                    <Button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = audioUrl;
                        a.download = 'voiceover.mp3';
                        a.click();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Audio
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Individual Scene Scripts (Read-only) */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Individual Scene Scripts</h3>
            <div className="space-y-3">
              {scenes
                .sort((a, b) => a.sceneNumber - b.sceneNumber)
                .map((scene) => (
                  <details key={scene.id} className="border rounded-lg p-4 bg-muted/30">
                    <summary className="cursor-pointer flex items-center gap-3">
                      <span className="px-3 py-1 bg-primary rounded-full text-primary-foreground text-sm font-semibold">
                        Scene {scene.sceneNumber}
                      </span>
                      <span className="font-medium">{scene.title}</span>
                    </summary>
                    <div className="mt-3 pl-2">
                      <p className="text-sm text-muted-foreground">{scene.audioScript}</p>
                    </div>
                  </details>
                ))}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('video-generation')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back: Videos
          </Button>
          
          <Button
            onClick={() => setCurrentStep('final')}
            disabled={!audioUrl}
          >
            Next: Final Preview
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderVideoGenerationStep = () => {
    const progress = getVideoGenerationProgress();
    const allCompleted = allVideosCompleted();

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Generate Scene Videos</h2>
          <p className="text-muted-foreground">
            Using RunPod WAN 2.2 T2V 720p API • 1280×720 resolution • Quality: 30 steps
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="border-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Generation Progress</h3>
                <p className="text-muted-foreground text-sm">
                  {progress.completed} of {progress.total} videos completed
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!allCompleted && (
                  <Button
                    onClick={handleGenerateAllVideos}
                    disabled={scenes.some(s => s.videoStatus === 'generating')}
                    size="lg"
                  >
                    {scenes.some(s => s.videoStatus === 'generating') ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={20} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2" size={20} />
                        Generate All Videos
                      </>
                    )}
                  </Button>
                )}
                {allCompleted && (
                  <div className="flex items-center gap-2 text-green-500">
                    <Check size={24} />
                    <span className="font-semibold">All Videos Ready!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Scene Video Cards */}
        <div className="space-y-4">
          {scenes.map((scene) => (
            <Card key={scene.id} className="border-l-4" style={{
              borderLeftColor: 
                scene.videoStatus === 'completed' ? '#22c55e' :
                scene.videoStatus === 'generating' ? '#3b82f6' :
                scene.videoStatus === 'failed' ? '#ef4444' : '#6b7280'
            }}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        Scene {scene.sceneNumber}
                      </span>
                      <h3 className="text-xl font-bold">{scene.title}</h3>
                      
                      {/* Status Badge */}
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        scene.videoStatus === 'completed' ? 'bg-green-500/20 text-green-500' :
                        scene.videoStatus === 'generating' ? 'bg-blue-500/20 text-blue-500' :
                        scene.videoStatus === 'failed' ? 'bg-red-500/20 text-red-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {scene.videoStatus === 'completed' && <Check size={14} />}
                        {scene.videoStatus === 'generating' && <Loader2 size={14} className="animate-spin" />}
                        {scene.videoStatus === 'failed' && <AlertCircle size={14} />}
                        {scene.videoStatus === 'pending' && <Video size={14} />}
                        
                        {scene.videoStatus === 'completed' && 'Complete'}
                        {scene.videoStatus === 'generating' && 'Generating'}
                        {scene.videoStatus === 'failed' && 'Failed'}
                        {scene.videoStatus === 'pending' && 'Pending'}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-3">{scene.visualDescription}</p>
                    
                    {/* Duration */}
                    <div className="text-sm text-muted-foreground">
                      Duration: <span className="font-semibold">{scene.duration}s</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    {scene.videoStatus === 'pending' && (
                      <Button
                        onClick={() => generateSceneVideo(scene.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Play size={16} className="mr-1" />
                        Generate
                      </Button>
                    )}
                    {scene.videoStatus === 'generating' && (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 size={16} className="mr-1 animate-spin" />
                        Processing...
                      </Button>
                    )}
                    {scene.videoStatus === 'failed' && (
                      <Button
                        onClick={() => handleRegenerateSceneVideo(scene.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                      >
                        <RefreshCw size={16} className="mr-1" />
                        Retry
                      </Button>
                    )}
                    {scene.videoStatus === 'completed' && scene.videoUrl && (
                      <Button
                        onClick={() => handleRegenerateSceneVideo(scene.id)}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw size={16} className="mr-1" />
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Video Player */}
                {scene.videoStatus === 'completed' && scene.videoUrl && (
                  <div className="mt-4">
                    <video
                      src={scene.videoUrl}
                      controls
                      className="w-full rounded-lg border-2 border-green-500/20"
                      style={{ maxHeight: '400px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Error Message */}
                {scene.videoStatus === 'failed' && scene.videoError && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-500 flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{scene.videoError}</span>
                    </p>
                  </div>
                )}

                {/* Detailed Prompt Preview */}
                <details className="mt-4">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    View Full Prompt ({scene.detailedPrompt.split(' ').length} words)
                  </summary>
                  <div className="mt-3 p-4 bg-muted/50 rounded-lg border text-sm">
                    {scene.detailedPrompt}
                  </div>
                </details>
              </div>
            </Card>
          ))}
        </div>

        {/* Combined Video Section */}
        {allCompleted && (
          <Card className="border-2 border-primary">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">Combined Video</h3>
                  <p className="text-muted-foreground text-sm">
                    Merge all {scenes.length} scenes into one continuous video
                  </p>
                </div>
                {!combinedVideoUrl && (
                  <Button
                    onClick={handleCombineVideos}
                    disabled={isCombining}
                    size="lg"
                    className="bg-primary"
                  >
                    {isCombining ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={20} />
                        Combining...
                      </>
                    ) : (
                      <>
                        <Video className="mr-2" size={20} />
                        Combine All Videos
                      </>
                    )}
                  </Button>
                )}
              </div>

              {combinedVideoUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-500 mb-3">
                    <Check size={24} />
                    <span className="font-semibold text-lg">Merged Video Ready!</span>
                  </div>
                  
                  {/* Single merged video player */}
                  <div className="relative">
                    <video
                      src={combinedVideoUrl}
                      controls
                      className="w-full rounded-lg border-2 border-primary"
                      style={{ maxHeight: '500px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground flex-1">
                      ✨ All {scenes.length} scenes merged into one video by Flask API!
                    </p>
                  </div>
                </div>
              )}

              {!combinedVideoUrl && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Note:</strong> Videos will be merged using Flask API with FFmpeg. 
                    Make sure the Flask server is running at <code>http://localhost:4000</code>. 
                    Click "Combine All Videos" above to merge all {scenes.length} scenes into one video.
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Individual Scene Videos */}
        {allCompleted && (
          <Card className="border-2">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Individual Scene Videos</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Preview each scene separately
              </p>

              <div className="space-y-4">
                {scenes
                  .sort((a, b) => a.sceneNumber - b.sceneNumber)
                  .map((scene) => scene.videoUrl && (
                    <details key={scene.id} className="border rounded-lg p-4 bg-muted/30">
                      <summary className="cursor-pointer flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary rounded-full text-primary-foreground text-sm font-semibold">
                          Scene {scene.sceneNumber}
                        </span>
                        <h4 className="text-lg font-bold">{scene.title}</h4>
                        <span className="text-sm text-muted-foreground ml-auto">{scene.duration}s</span>
                      </summary>
                      <div className="mt-3">
                        <video
                          src={scene.videoUrl}
                          controls
                          className="w-full rounded-lg border-2 border-primary/20"
                          style={{ maxHeight: '400px' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            onClick={() => setCurrentStep('storyboard')}
            variant="outline"
          >
            <ChevronLeft className="mr-2" size={18} />
            Back to Storyboard
          </Button>
          <Button
            onClick={() => setCurrentStep('audio')}
            disabled={!allCompleted}
            title={!allCompleted ? "Please wait for all videos to complete" : ""}
          >
            Next: Audio Setup
            <ChevronRight className="ml-2" size={18} />
          </Button>
        </div>
      </div>
    );
  };

  const renderFinalStep = () => {
    const totalDuration = getTotalDuration();
    
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Cinematic Journey</h2>
          <p className="text-muted-foreground">Ready for the world</p>
        </div>

        <Card>
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-primary rounded-xl">
                <Video className="text-primary-foreground" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Mountain Bike Journey</h3>
                <p className="text-muted-foreground">AI-Generated Cinematic Story</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4 border">
                <p className="text-muted-foreground text-sm mb-1">Total Duration</p>
                <p className="text-2xl font-bold">{totalDuration}s</p>
              </div>
              <div className="bg-muted rounded-lg p-4 border">
                <p className="text-muted-foreground text-sm mb-1">Scenes</p>
                <p className="text-2xl font-bold">{scenes.length}</p>
              </div>
              <div className="bg-muted rounded-lg p-4 border">
                <p className="text-muted-foreground text-sm mb-1">Voice Tone</p>
                <p className="text-lg font-bold">{TONE_PRESETS.find(t => t.id === settings.voiceoverTone)?.name}</p>
              </div>
            </div>

            {/* Timeline Visualization */}
            <div className="mb-6">
              <Label className="mb-3">Scene Timeline</Label>
              <div className="flex gap-1 h-12 rounded-lg overflow-hidden border">
                {scenes.map((scene, index) => {
                  const colors = [
                    'bg-orange-500',
                    'bg-cyan-500',
                    'bg-pink-500',
                    'bg-indigo-500',
                    'bg-emerald-500'
                  ];
                  
                  return (
                    <div
                      key={scene.id}
                      className={`flex-1 flex items-center justify-center ${colors[index % colors.length]} text-white text-xs font-semibold`}
                      title={scene.title}
                    >
                      {scene.sceneNumber}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>0:00</span>
                <span>{totalDuration}s</span>
              </div>
            </div>

            {/* Scene List */}
            <div className="space-y-3 mb-6">
              <Label>Scenes Overview</Label>
              {scenes.map((scene) => (
                <div key={scene.id} className="bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{scene.sceneNumber}. {scene.title}</p>
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{scene.audioScript}</p>
                    </div>
                    <span className="text-primary text-sm ml-4">{scene.duration}s</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Merge Video & Audio Section */}
            {combinedVideoUrl && audioUrl && !finalVideoUrl && (
              <div className="mb-6 p-6 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Ready to Merge</h4>
                    <p className="text-sm text-muted-foreground">
                      Combine your video with voiceover to create the final masterpiece
                    </p>
                  </div>
                  <Button
                    onClick={handleMergeFinalVideo}
                    disabled={isMergingFinal}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    {isMergingFinal ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={20} />
                        Merging...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2" size={20} />
                        Merge Video & Audio
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Final Video Player */}
            {finalVideoUrl && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <Label className="text-xl">🎬 Final Video with Audio</Label>
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                    Ready!
                  </span>
                </div>
                <video
                  src={finalVideoUrl}
                  controls
                  className="w-full rounded-lg border-4 border-green-500/30 shadow-lg shadow-green-500/20"
                  style={{ maxHeight: '500px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Video and Audio Players (Preview) */}
            {!finalVideoUrl && combinedVideoUrl && (
              <div className="space-y-4 mb-6">
                <Label>Combined Video (Preview)</Label>
                <video
                  src={combinedVideoUrl}
                  controls
                  className="w-full rounded-lg border-2 border-primary"
                  style={{ maxHeight: '400px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {!finalVideoUrl && audioUrl && (
              <div className="space-y-4 mb-6">
                <Label>Generated Voiceover (Preview)</Label>
                <audio
                  src={audioUrl}
                  controls
                  className="w-full"
                />
              </div>
            )}

            {!combinedVideoUrl && !audioUrl && (
              <div className="bg-muted rounded-lg p-8 border mb-6">
                <div className="aspect-video bg-card rounded-lg flex items-center justify-center border">
                  <div className="text-center">
                    <Play className="mx-auto text-primary mb-3" size={48} />
                    <p className="font-semibold">Preview Unavailable</p>
                    <p className="text-muted-foreground text-sm mt-1">Generate videos and audio first</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                variant={finalVideoUrl ? "default" : "outline"}
                disabled={!finalVideoUrl && !combinedVideoUrl}
                onClick={() => {
                  const videoToDownload = finalVideoUrl || combinedVideoUrl;
                  if (videoToDownload) {
                    const a = document.createElement('a');
                    a.href = videoToDownload;
                    a.download = finalVideoUrl ? 'final-video-with-audio.mp4' : 'combined-video.mp4';
                    a.click();
                  }
                }}
                className={finalVideoUrl ? "bg-gradient-to-r from-primary to-accent" : ""}
              >
                <Download className="mr-2" size={18} />
                {finalVideoUrl ? 'Download Final Video' : 'Download Video'}
              </Button>
              <Button 
                variant="outline"
                disabled={!audioUrl}
                onClick={() => {
                  if (audioUrl) {
                    const a = document.createElement('a');
                    a.href = audioUrl;
                    a.download = 'voiceover.mp3';
                    a.click();
                  }
                }}
              >
                <Download className="mr-2" size={18} />
                Download Audio
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  const script = getCombinedAudioScript();
                  const blob = new Blob([script], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'script.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="mr-2" size={18} />
                Download Script
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-between pt-6">
          <Button
            onClick={() => setCurrentStep('audio')}
            variant="outline"
          >
            <ChevronLeft className="mr-2" size={18} />
            Back to Audio
          </Button>
          <Button
            onClick={() => {
              setCurrentStep('idea');
              setScenes([]);
              toast.success("Ready for Your Next Journey! 🚀", {
                description: "Start a new storyboard anytime.",
              });
            }}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Sparkles className="mr-2" size={18} />
            Start New Project
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar currentPage="ai-storyboard" onPageChange={() => {}} />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">AI Ride Storyboard</h1>
            <p className="text-muted-foreground">Cinematic Story Generator (Demo)</p>
          </div>

          {renderStepIndicator()}

          {currentStep === 'idea' && renderIdeaStep()}
          {currentStep === 'storyboard' && renderStoryboardStep()}
          {currentStep === 'video-generation' && renderVideoGenerationStep()}
          {currentStep === 'audio' && renderAudioStep()}
          {currentStep === 'final' && renderFinalStep()}
        </div>
      </main>

      {/* Script Editing Dialog */}
      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Edit Voiceover Script</DialogTitle>
            <DialogDescription>
              This is the combined script from all {scenes.length} scenes. Make any edits before generating the audio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2">Full Script (Editable)</Label>
              <Textarea
                value={editedAudioScript}
                onChange={(e) => setEditedAudioScript(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder="Edit your voiceover script here..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Character count: {editedAudioScript.length}
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
              disabled={!editedAudioScript.trim()}
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
