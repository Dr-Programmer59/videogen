import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { composeImages } from '@/utils/imageCompositionService';
import { uploadImageToGCS } from '@/utils/gcsUploader';
import { Loader2, User, Image as ImageIcon, Layers, Cloud, CheckCircle2 } from 'lucide-react';
import CharacterBuilder from './CharacterBuilder';
import EnvironmentBuilder from './EnvironmentBuilder';

type Step = 'character' | 'environment' | 'compose';

export default function AIInfluencer() {
  const [currentStep, setCurrentStep] = useState<Step>('character');
  
  // Generated images (stored as base64 data URLs)
  const [characterImageData, setCharacterImageData] = useState<string>('');
  const [environmentImageData, setEnvironmentImageData] = useState<string>('');
  const [composedImageUrl, setComposedImageUrl] = useState<string>('');
  
  // Composition state
  const [isComposing, setIsComposing] = useState(false);
  const [compositionStatus, setCompositionStatus] = useState('');

  // Upload state
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step completion tracking
  const [hasCharacter, setHasCharacter] = useState(false);
  const [hasEnvironment, setHasEnvironment] = useState(false);

  // Compose Images and Upload
  const handleComposeAndUpload = async () => {
    if (!characterImageData || !environmentImageData) {
      toast.error('Please generate both character and environment first');
      return;
    }

    setIsComposing(true);
    setCompositionStatus('Composing images...');
    setComposedImageUrl('');
    setUploadedUrl('');

    try {
      toast.info('Composing Images... 🎨', {
        description: 'Combining character with environment',
        duration: 3000
      });

      // Extract base64 from data URLs (remove data:image/png;base64, prefix)
      const characterBase64 = characterImageData.replace(/^data:image\/\w+;base64,/, '');
      const environmentBase64 = environmentImageData.replace(/^data:image\/\w+;base64,/, '');

      console.log('🖼️ Starting image composition...');
      console.log('📏 Character base64 length:', characterBase64.length);
      console.log('📏 Environment base64 length:', environmentBase64.length);

      const composedBase64 = await composeImages(
        characterBase64,
        environmentBase64,
        (status) => {
          console.log('📊 Composition status:', status);
          setCompositionStatus(status);
          
          if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
            toast.info(`🔄 ${status}`, {
              description: 'Composing images...',
              duration: 2000
            });
          }
        },
        5 // shrink_pixels
      );

      console.log('✅ Composition complete! Base64 length:', composedBase64.length);

      // Convert base64 to data URL for display
      const composedDataUrl = `data:image/png;base64,${composedBase64}`;
      setComposedImageUrl(composedDataUrl);
      setCompositionStatus('Uploading to cloud...');

      toast.info('Uploading to Cloud... ☁️', {
        description: 'Saving your influencer image',
        duration: 3000
      });

      console.log('☁️ Starting upload to GCS...');
      
      const url = await uploadImageToGCS(
        composedDataUrl,
        `ai-influencer-${Date.now()}.png`,
        (progress) => {
          console.log(`📤 Upload progress: ${progress}%`);
          setUploadProgress(progress);
          setCompositionStatus(`Uploading... ${progress}%`);
        }
      );

      console.log('✅ Upload complete! Public URL:', url);
      console.log('🔗 Image accessible at:', url);

      setUploadedUrl(url);
      setIsComposing(false);
      setCompositionStatus('Complete!');

      toast.success('Complete! 🎉', {
        description: 'Your influencer image is composed and uploaded to cloud storage'
      });

    } catch (error) {
      setIsComposing(false);
      setCompositionStatus('Failed');
      console.error('❌ Error during composition/upload:', error);
      toast.error('Operation Failed', {
        description: error instanceof Error ? error.message : 'Failed to compose or upload images'
      });
    }
  };

  const steps = [
    { id: 'character' as Step, label: 'Generate Character', icon: User, completed: hasCharacter },
    { id: 'environment' as Step, label: 'Generate Environment', icon: ImageIcon, completed: hasEnvironment },
    { id: 'compose' as Step, label: 'Compose & Upload', icon: Layers, completed: !!uploadedUrl },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">AI Influencer Creator</h1>
          <p className="text-muted-foreground text-lg">
            Create professional influencer content by combining AI-generated characters with stunning environments
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = step.completed;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : isCompleted
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    <span className="font-medium hidden sm:inline">{step.label}</span>
                  </button>
                  
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 ${
                      step.completed ? 'bg-green-500' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Step 1: Character */}
        {currentStep === 'character' && (
          <div className="space-y-6">
            {/* Show captured character preview if exists */}
            {characterImageData && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    Character Captured
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xs mx-auto">
                    <img 
                      src={characterImageData} 
                      alt="Captured Character" 
                      className="w-full h-auto rounded-lg border-2 border-green-500/20"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      This character will be used in composition
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Step 1: Generate Character
                </CardTitle>
                <CardDescription>
                  Use the comprehensive character builder to create your AI influencer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CharacterBuilder 
                  savedImageUrl={characterImageData}
                  onPromptBuilt={(prompt, parts) => {
                    console.log('Character prompt built:', prompt);
                  }}
                  onGenerate={(imageUrl) => {
                    console.log('✅ Character image captured directly!');
                    console.log('📸 Image data URL length:', imageUrl.length);
                    console.log('🔗 Data URL preview:', imageUrl.substring(0, 100) + '...');
                    setCharacterImageData(imageUrl);
                    setHasCharacter(true);
                    toast.success('Character Generated! ✨', {
                      description: 'Click "Next" to proceed to environment generation',
                      duration: 3000
                    });
                  }}
                />
              </CardContent>
            </Card>

            {hasCharacter && (
              <div className="flex justify-center">
                <Button 
                  onClick={() => setCurrentStep('environment')}
                  size="lg"
                  className="gap-2"
                >
                  Next: Generate Environment
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Environment */}
        {currentStep === 'environment' && (
          <div className="space-y-6">
            {/* Show captured environment preview if exists */}
            {environmentImageData && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    Environment Captured
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xs mx-auto">
                    <img 
                      src={environmentImageData} 
                      alt="Captured Environment" 
                      className="w-full h-auto rounded-lg border-2 border-green-500/20"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      This environment will be used in composition
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-6 h-6" />
                  Step 2: Generate Environment
                </CardTitle>
                <CardDescription>
                  Use the comprehensive environment builder to create the perfect background
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnvironmentBuilder 
                  savedImageUrl={environmentImageData}
                  onPromptBuilt={(prompt, parts) => {
                    console.log('Environment prompt built:', prompt);
                  }}
                  onGenerate={(imageUrl) => {
                    console.log('✅ Environment image captured directly!');
                    console.log('📸 Image data URL length:', imageUrl.length);
                    console.log('🔗 Data URL preview:', imageUrl.substring(0, 100) + '...');
                    setEnvironmentImageData(imageUrl);
                    setHasEnvironment(true);
                    toast.success('Environment Generated! 🌄', {
                      description: 'Click "Next" to compose both images',
                      duration: 3000
                    });
                  }}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                onClick={() => setCurrentStep('character')}
                variant="outline"
                size="lg"
              >
                Back to Character
              </Button>
              
              {hasEnvironment && (
                <Button 
                  onClick={() => setCurrentStep('compose')}
                  size="lg"
                  className="gap-2"
                >
                  Next: Compose Images
                  <Layers className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Compose & Upload */}
        {currentStep === 'compose' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-6 h-6" />
                  Step 3: Compose & Upload
                </CardTitle>
                <CardDescription>
                  Review your images, compose them together, and upload to cloud storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preview Images */}
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Character</Label>
                    {characterImageData ? (
                      <div className="border rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={characterImageData} 
                          alt="Character Preview" 
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="border rounded-lg bg-muted aspect-square flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No character generated</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Environment</Label>
                    {environmentImageData ? (
                      <div className="border rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={environmentImageData} 
                          alt="Environment Preview" 
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="border rounded-lg bg-muted aspect-square flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No environment generated</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compose & Upload Button */}
                <Button 
                  onClick={handleComposeAndUpload}
                  disabled={isComposing || !characterImageData || !environmentImageData}
                  className="w-full"
                  size="lg"
                >
                  {isComposing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {compositionStatus}
                    </>
                  ) : (
                    <>
                      <Layers className="mr-2 h-5 w-5" />
                      Compose & Upload to Cloud
                    </>
                  )}
                </Button>

                {!characterImageData && !environmentImageData && (
                  <p className="text-sm text-muted-foreground text-center">
                    Generate both character and environment first
                  </p>
                )}
                
                {characterImageData && !environmentImageData && (
                  <p className="text-sm text-muted-foreground text-center">
                    Character ready! Generate environment in Step 2
                  </p>
                )}
                
                {!characterImageData && environmentImageData && (
                  <p className="text-sm text-muted-foreground text-center">
                    Environment ready! Generate character in Step 1
                  </p>
                )}

                {/* Composed Result */}
                {composedImageUrl && (
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-lg font-semibold">Final Composed Image</Label>
                    <div className="border-2 border-primary rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={composedImageUrl} 
                        alt="Composed Final Image" 
                        className="w-full h-auto"
                      />
                    </div>

                    {/* Upload Status & Result */}
                    {uploadedUrl && (
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <Label className="text-sm font-medium">Uploaded to Cloud Storage!</Label>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Public URL</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={uploadedUrl} 
                              readOnly 
                              className="flex-1 font-mono text-sm"
                            />
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(uploadedUrl);
                                toast.success('URL copied to clipboard!');
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Copy
                            </Button>
                          </div>
                          <a 
                            href={uploadedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View in new tab →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                onClick={() => setCurrentStep('environment')}
                variant="outline"
                size="lg"
                disabled={isComposing}
              >
                Back to Environment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
