// RunPod API Service for Text-to-Image generation

const API_URL = "https://api.runpod.ai/v2/86zngifdc1ukdz/run";
const STATUS_URL = "https://api.runpod.ai/v2/86zngifdc1ukdz/status";

interface RunPodJobResponse {
  id: string;
  status: string;
}

interface RunPodStatusResponse {
  delayTime?: number;
  executionTime?: number;
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output?: {
    image_base64?: string;
    status?: string;
  };
  workerId?: string;
  error?: string;
}

/**
 * Get RunPod API key from environment
 */
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_RUNPOD_API_KEY;
  
  if (!apiKey || apiKey === 'your_runpod_api_key_here') {
    throw new Error('RunPod API key not configured. Please add VITE_RUNPOD_API_KEY to your .env file');
  }
  
  return apiKey;
};

/**
 * Submit a text-to-image generation job to RunPod
 */
export const submitTextToImageJob = async (
  prompt: string,
  width: number = 720,
  height: number = 1024,
  numInferenceSteps: number = 28,
  guidanceScale: number = 4.5
): Promise<string> => {
  const apiKey = getApiKey();
  
  const payload = {
    input: {
      prompt,
      width,
      height,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale
    }
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  console.log('🚀 Submitting image generation job to RunPod...');
  console.log('Prompt:', prompt);
  console.log('Dimensions:', `${width}x${height}`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod API error ${response.status}: ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log('✅ Job submitted successfully. Job ID:', result.id);
  console.log('Status:', result.status);
  console.log('📦 Full Response:', JSON.stringify(result, null, 2));
  
  return result.id;
};

/**
 * Check the status of a RunPod job
 */
export const checkJobStatus = async (jobId: string): Promise<RunPodStatusResponse> => {
  const apiKey = getApiKey();
  
  const headers = {
    "Authorization": `Bearer ${apiKey}`
  };

  const response = await fetch(`${STATUS_URL}/${jobId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod status check error ${response.status}: ${errorText}`);
  }

  const result: RunPodStatusResponse = await response.json();
  console.log('📊 Status Check Response:', JSON.stringify(result, null, 2));
  
  return result;
};

/**
 * Poll job status until completion or failure
 * Returns the generated image in base64 format
 */
export const pollJobUntilComplete = async (
  jobId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<string> => {
  console.log('⏳ Polling job status...');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkJobStatus(jobId);
    
    console.log(`Poll attempt ${attempt + 1}/${maxAttempts} - Status: ${status.status}`);
    console.log('📦 Poll Response:', JSON.stringify(status, null, 2));
    
    if (onProgress) {
      onProgress(status.status);
    }

    if (status.status === 'COMPLETED') {
      if (status.output?.image_base64) {
        console.log('✅ Image generation completed successfully!');
        console.log('📸 Image Output:', JSON.stringify(status.output, null, 2));
        return status.output.image_base64;
      } else {
        throw new Error('Job completed but no image data received');
      }
    }

    if (status.status === 'FAILED') {
      throw new Error(`Job failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Job timeout: Maximum polling attempts reached');
};

/**
 * Convert base64 string to blob URL for display
 */
export const base64ToImageUrl = (base64Data: string): string => {
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  // Convert base64 to binary
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create blob and URL
  const blob = new Blob([bytes], { type: 'image/png' });
  return URL.createObjectURL(blob);
};

/**
 * Complete workflow: Submit job, poll until complete, return image URL
 */
export const generateImage = async (
  prompt: string,
  onProgress?: (status: string) => void,
  width: number = 720,
  height: number = 1024
): Promise<string> => {
  try {
    // Submit the job
    const jobId = await submitTextToImageJob(prompt, width, height);
    
    // Poll until complete
    const base64Image = await pollJobUntilComplete(jobId, onProgress);
    
    // Return as data URL (not blob URL) so it can be used for composition
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    console.log('📸 Returning image as data URL. Length:', dataUrl.length);
    
    return dataUrl;
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    throw error;
  }
};
