// Environment Image Generation Service
// Uses the same RunPod Flux Schnell endpoint as character generation

import { generateImage as runpodGenerateImage } from './runpodService';

/**
 * Generate environment/background image
 * This is a wrapper around the existing generateImage function
 */
export const generateEnvironment = async (
  prompt: string,
  width: number = 1024,
  height: number = 1024,
  onProgress?: (status: string) => void
): Promise<string> => {
  console.log('🌄 Generating environment image...');
  console.log(`📝 Prompt: ${prompt}`);
  console.log(`📐 Dimensions: ${width}x${height}`);

  try {
    // Use the same image generation service
    const imageBase64 = await runpodGenerateImage(prompt, width, height, onProgress);
    
    console.log('✅ Environment image generated successfully!');
    return imageBase64;
  } catch (error) {
    console.error('❌ Environment generation failed:', error);
    throw error;
  }
};
