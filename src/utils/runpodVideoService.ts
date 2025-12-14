// RunPod WAN 2.2 T2V 720p API Service for Text-to-Video generation

const API_URL = "https://api.runpod.ai/v2/wan-2-2-t2v-720/run";
const STATUS_URL = "https://api.runpod.ai/v2/wan-2-2-t2v-720/status";

// IMPORTANT: your RunPod public endpoint currently validates `duration` to be
// one of these allowed values. If you change the schema in RunPod, update this.
const ALLOWED_DURATIONS = [5, 8];

/**
 * Normalize requested duration to one of the allowed values.
 * - If it matches exactly, keep it.
 * - If it's below min, clamp to min.
 * - If it's above max, clamp to max.
 * - If it's between allowed values, snap to nearest.
 */
const normalizeDurationToAllowed = (duration: number): number => {
  if (ALLOWED_DURATIONS.includes(duration)) return duration;

  const min = ALLOWED_DURATIONS[0];
  const max = ALLOWED_DURATIONS[ALLOWED_DURATIONS.length - 1];

  if (duration <= min) {
    console.warn(
      `[RunPod] Requested duration ${duration}s is below minimum; clamping to ${min}s`
    );
    return min;
  }

  if (duration >= max) {
    console.warn(
      `[RunPod] Requested duration ${duration}s is above maximum; clamping to ${max}s`
    );
    return max;
  }

  // Between min and max but not equal to either → snap to nearest
  const lower = min; // 5
  const upper = max; // 8
  const snapped =
    duration - lower <= upper - duration ? lower : upper;

  console.warn(
    `[RunPod] Requested duration ${duration}s is not allowed; snapping to nearest allowed ${snapped}s (allowed: ${ALLOWED_DURATIONS.join(
      ", "
    )})`
  );

  return snapped;
};

interface RunPodVideoJobResponse {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output?: {
    result?: string;      // Video URL is in output.result
    cost?: number;
    video_url?: string;   // Fallback
    width?: number;
    height?: number;
    duration?: number;
    seed?: number;
    generation_time?: number;
  };
  error?: string;
}

interface RunPodVideoStatusResponse {
  delayTime?: number;
  executionTime?: number;
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output?: {
    result?: string;      // Video URL is in output.result
    cost?: number;
    video_url?: string;   // Fallback
    width?: number;
    height?: number;
    duration?: number;
    seed?: number;
    generation_time?: number;
  };
  workerId?: string;
  error?: string;
}

/**
 * Get RunPod API key from environment
 */
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_RUNPOD_API_KEY;

  if (!apiKey || apiKey === "your_runpod_api_key_here") {
    throw new Error(
      "RunPod API key not configured. Please add VITE_RUNPOD_API_KEY to your .env file"
    );
  }

  return apiKey;
};

/**
 * Submit a text-to-video generation job to RunPod WAN 2.2 T2V 720p API
 *
 * @param prompt - Detailed description of the video scene
 * @param duration - Video duration in seconds (will be normalized to allowed values: 5 or 8)
 * @param size - Resolution as "WIDTH*HEIGHT" (default: "1280*720")
 * @param num_inference_steps - Quality steps, 20-40 (default: 30)
 * @param guidance - Prompt adherence strength, 3-8 (default: 5)
 * @param seed - Random seed, use -1 for random (default: -1)
 * @param negative_prompt - Things to avoid in the video
 * @param enable_safety_checker - Run safety checks (default: true)
 * @param enable_prompt_optimization - Use internal prompt optimizer (default: false)
 */
export const submitTextToVideoJob = async (
  prompt: string,
  duration: number = 5,
  size: string = "1280*720",
  num_inference_steps: number = 30,
  guidance: number = 5,
  seed: number = -1,
  negative_prompt?: string,
  enable_safety_checker: boolean = true,
  enable_prompt_optimization: boolean = false
): Promise<string> => {
  const apiKey = getApiKey();

  // Normalize duration to what the RunPod endpoint schema allows
  const normalizedDuration = normalizeDurationToAllowed(duration);

  const payload: any = {
    input: {
      prompt,
      size,
      duration: normalizedDuration,
      num_inference_steps,
      guidance,
      seed,
      enable_safety_checker,
      enable_prompt_optimization,
    },
  };

  // Add negative prompt only if provided
  if (negative_prompt) {
    payload.input.negative_prompt = negative_prompt;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  console.log("🎬 Submitting video generation job to RunPod WAN 2.2 T2V 720p...");
  console.log("Prompt:", prompt);
  console.log("Size:", size);
  console.log("Requested Duration:", duration, "seconds");
  console.log("Sending Duration:", normalizedDuration, "seconds");
  console.log("Inference Steps:", num_inference_steps);
  console.log("Guidance:", guidance);
  console.log("Seed:", seed);
  if (negative_prompt) console.log("Negative Prompt:", negative_prompt);

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod API error ${response.status}: ${errorText}`);
  }

  const result: RunPodVideoJobResponse = await response.json();
  console.log("✅ Video job submitted successfully. Job ID:", result.id);
  console.log("Status:", result.status);
  console.log("📦 Full Response:", JSON.stringify(result, null, 2));

  return result.id;
};

/**
 * Check the status of a RunPod video job
 */
export const checkVideoJobStatus = async (
  jobId: string
): Promise<RunPodVideoStatusResponse> => {
  const apiKey = getApiKey();

  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  const response = await fetch(`${STATUS_URL}/${jobId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`RunPod status check error ${response.status}: ${errorText}`);
  }

  const result: RunPodVideoStatusResponse = await response.json();
  console.log("📊 Status Check Response:", JSON.stringify(result, null, 2));
  return result;
};

/**
 * Poll video job status until completion or failure
 * Returns the video URL
 */
export const pollVideoJobUntilComplete = async (
  jobId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 120,
  intervalMs: number = 3000
): Promise<string> => {
  console.log("⏳ Polling video job status...");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkVideoJobStatus(jobId);

    console.log(
      `Poll attempt ${attempt + 1}/${maxAttempts} - Status: ${status.status}`
    );

    if (onProgress) {
      onProgress(status.status);
    }

    if (status.status === "COMPLETED") {
      const videoUrl = status.output?.result || status.output?.video_url;
      if (videoUrl) {
        console.log("✅ Video generation completed successfully!");
        console.log("Video URL:", videoUrl);
        if (status.output?.cost) {
          console.log("Cost:", status.output.cost);
        }
        if (status.output?.seed) {
          console.log("Seed:", status.output.seed);
        }
        if (status.output?.generation_time) {
          console.log(
            "Generation Time:",
            status.output.generation_time,
            "seconds"
          );
        }
        return videoUrl;
      } else {
        throw new Error("Job completed but no video URL received");
      }
    }

    if (status.status === "FAILED") {
      throw new Error(`Job failed: ${status.error || "Unknown error"}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // This is what your StoryboardWizard is catching as "Video generation timeout"
  throw new Error("Video generation timeout");
};

/**
 * Complete workflow: Submit job, poll until complete, return video URL
 */
export const generateVideo = async (
  prompt: string,
  duration: number = 5,
  onProgress?: (status: string) => void,
  size: string = "1280*720",
  num_inference_steps: number = 30,
  guidance: number = 5,
  seed: number = -1,
  negative_prompt?: string,
  enable_safety_checker: boolean = true,
  enable_prompt_optimization: boolean = false
): Promise<string> => {
  try {
    // Submit the job (duration will be normalized internally)
    const jobId = await submitTextToVideoJob(
      prompt,
      duration,
      size,
      num_inference_steps,
      guidance,
      seed,
      negative_prompt,
      enable_safety_checker,
      enable_prompt_optimization
    );

    // Poll until complete
    const videoUrl = await pollVideoJobUntilComplete(jobId, onProgress);

    return videoUrl;
  } catch (error) {
    console.error("❌ Video generation failed:", error);
    throw error;
  }
};
