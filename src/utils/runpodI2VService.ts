// RunPod API Service for Image-to-Video generation

const API_URL = "https://api.runpod.ai/v2/o2hasm8tmfewuw/run";
const STATUS_URL = "https://api.runpod.ai/v2/o2hasm8tmfewuw/status";

interface RunPodI2VJobResponse {
  id: string;
  status: string;
}

interface RunPodI2VStatusResponse {
  delayTime?: number;
  executionTime?: number;
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output?: {
    gcs_url?: string;
    video_url?: string;
    status?: string;
    seed?: number;
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
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Submit an image-to-video generation job to RunPod
 */
export const submitImageToVideoJob = async (
  imageFile: File,
  prompt: string,
  frameNum: number = 21,
  samplingSteps: number = 6
): Promise<string> => {
  const apiKey = getApiKey();
  
  // Convert image to base64
  const imageBase64 = await fileToBase64(imageFile);
  
  const payload = {
    input: {
      prompt,
      image_base64: imageBase64,
      frame_num: frameNum,
      sampling_steps: samplingSteps
    }
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  console.log('🎬 Submitting image-to-video job to RunPod...');
  console.log('Image:', imageFile.name);
  console.log('Prompt:', prompt);
  console.log('Frame Count:', frameNum);
  console.log('Sampling Steps:', samplingSteps);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod API error ${response.status}: ${errorText}`);
  }

  const result: RunPodI2VJobResponse = await response.json();
  console.log('✅ Image-to-video job submitted successfully. Job ID:', result.id);
  console.log('Status:', result.status);
  
  return result.id;
};

/**
 * Check the status of a RunPod image-to-video job
 */
export const checkI2VJobStatus = async (jobId: string): Promise<RunPodI2VStatusResponse> => {
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

  const result: RunPodI2VStatusResponse = await response.json();
  return result;
};

/**
 * Poll image-to-video job status until completion or failure
 * Returns the video URL
 */
export const pollI2VJobUntilComplete = async (
  jobId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 120,
  intervalMs: number = 3000
): Promise<string> => {
  console.log('⏳ Polling image-to-video job status...');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkI2VJobStatus(jobId);
    
    console.log(`Poll attempt ${attempt + 1}/${maxAttempts} - Status: ${status.status}`);
    
    if (onProgress) {
      onProgress(status.status);
    }

    if (status.status === 'COMPLETED') {
      const videoUrl = status.output?.gcs_url || status.output?.video_url;
      if (videoUrl) {
        console.log('✅ Image-to-video generation completed successfully!');
        console.log('Video URL:', videoUrl);
        if (status.output?.seed) {
          console.log('Seed:', status.output.seed);
        }
        return videoUrl;
      } else {
        throw new Error('Job completed but no video URL received');
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
 * Complete workflow: Submit job, poll until complete, return video URL
 */
export const generateImageToVideo = async (
  imageFile: File,
  prompt: string,
  onProgress?: (status: string) => void,
  frameNum: number = 21,
  samplingSteps: number = 6
): Promise<string> => {
  try {
    // Submit the job
    const jobId = await submitImageToVideoJob(imageFile, prompt, frameNum, samplingSteps);
    
    // Poll until complete
    const videoUrl = await pollI2VJobUntilComplete(jobId, onProgress);
    
    return videoUrl;
  } catch (error) {
    console.error('❌ Image-to-video generation failed:', error);
    throw error;
  }
};
