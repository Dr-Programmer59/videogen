// Image Composition Service
// Combines foreground (character) and background images using RunPod API

const API_URL = "https://api.runpod.ai/v2/tob76lalk2ulxf/run";
const STATUS_URL = "https://api.runpod.ai/v2/tob76lalk2ulxf/status";
const API_KEY = import.meta.env.VITE_RUNPOD_API_KEY || '';

interface CompositionJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: {
    image_base64?: string;
    message?: string;
  };
  error?: string;
}

/**
 * Submit image composition job to RunPod
 */
export const submitCompositionJob = async (
  foregroundBase64: string,
  backgroundBase64: string,
  shrinkPixels: number = 5
): Promise<string> => {
  console.log('🎨 Submitting image composition job to RunPod...');
  console.log(`📐 Shrink pixels: ${shrinkPixels}`);
  console.log(`🖼️ Foreground image size: ${(foregroundBase64.length / 1024).toFixed(2)} KB`);
  console.log(`🌄 Background image size: ${(backgroundBase64.length / 1024).toFixed(2)} KB`);

  const payload = {
    input: {
      foreground_image: foregroundBase64,
      background_image: backgroundBase64,
      shrink_pixels: shrinkPixels
    }
  };

  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  };

  console.log(`📡 Endpoint: ${API_URL}`);
  console.log(`📦 Payload structure:`, {
    input: {
      foreground_image: `${foregroundBase64.substring(0, 50)}... (${foregroundBase64.length} chars)`,
      background_image: `${backgroundBase64.substring(0, 50)}... (${backgroundBase64.length} chars)`,
      shrink_pixels: shrinkPixels
    }
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Composition submission failed: ${response.status}`, errorText);
      throw new Error(`Composition API request failed: ${response.status}`);
    }

    const data: CompositionJobResponse = await response.json();
    console.log('✅ Composition job submitted successfully!');
    console.log('📦 Full Response:', JSON.stringify(data, null, 2));

    if (!data.id) {
      console.error('❌ No job ID in response!');
      throw new Error('No job ID returned from API');
    }

    console.log(`🎫 Job ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('❌ Composition job submission failed:', error);
    throw error;
  }
};

/**
 * Check composition job status
 */
export const checkCompositionStatus = async (jobId: string): Promise<CompositionJobResponse> => {
  const statusEndpoint = `${STATUS_URL}/${jobId}`;
  
  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  };

  console.log(`🔍 Checking composition status for job: ${jobId}`);

  try {
    const response = await fetch(statusEndpoint, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Status check failed: ${response.status}`, errorText);
      throw new Error(`Status check failed: ${response.status}`);
    }

    const result: CompositionJobResponse = await response.json();
    console.log('📊 Status Check Response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Status check failed:', error);
    throw error;
  }
};

/**
 * Poll composition job until completion
 */
export const pollCompositionUntilComplete = async (
  jobId: string,
  onProgress?: (status: string) => void,
  intervalMs: number = 2000
): Promise<string> => {
  console.log('⏳ Polling composition job status...');
  
  let attempts = 0;
  
  while (true) {
    attempts++;
    const status = await checkCompositionStatus(jobId);
    
    console.log(`📊 Attempt ${attempts}: Status = ${status.status}`);
    console.log('📦 Poll Response:', JSON.stringify(status, null, 2));
    
    if (onProgress) {
      onProgress(status.status);
    }

    if (status.status === 'COMPLETED') {
      if (status.output?.image_base64) {
        console.log('✅ Image composition completed successfully!');
        console.log('📸 Output size:', (status.output.image_base64.length / 1024).toFixed(2), 'KB');
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
};

/**
 * Compose images (one-shot: submit + poll)
 */
export const composeImages = async (
  foregroundBase64: string,
  backgroundBase64: string,
  onProgress?: (status: string) => void,
  shrinkPixels: number = 5
): Promise<string> => {
  console.log('🎨 Starting image composition...');
  
  if (onProgress) onProgress('Submitting composition job...');
  
  const jobId = await submitCompositionJob(foregroundBase64, backgroundBase64, shrinkPixels);
  
  if (onProgress) onProgress('Waiting for composition...');
  
  const composedImageBase64 = await pollCompositionUntilComplete(jobId, onProgress);
  
  console.log('✅ Composition completed successfully!');
  return composedImageBase64;
};
