// RunPod TTS Service with Emotion Vector Generation
// Handles text-to-speech generation using RunPod API with AI-generated emotion vectors

const RUNPOD_TTS_ENDPOINT = "https://api.runpod.ai/v2/lew07dpd05v8gd/run";
const RUNPOD_STATUS_ENDPOINT = "https://api.runpod.ai/v2/lew07dpd05v8gd/status";
const API_KEY = import.meta.env.VITE_RUNPOD_API_KEY || '';

// OpenAI API configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// Default speaker URL (you can change this or make it configurable)
const DEFAULT_SPEAKER_URL = "https://storage.googleapis.com/runpod_bucket_testing/uploads/198e9cb4-5153-4b3d-8fdc-8f4edf3b2796.mp3?Expires=1765574100&GoogleAccessId=runpod-uploader%40lunar-byte-392212.iam.gserviceaccount.com&Signature=Os2xeF%2Bjz5sKoV7J9npO0lemhrqPXVFgywjkDq%2B8yoE4sw4lecGaJH2IjlMFC%2FctH3ygbcTY5xrC3gm%2FKDKRsTECH4a%2FcCH7tht6CrbIMGeQ6ut9YGgubhIoHLt6GX1XrbdcsLrlpdST8mf6Z5FVL%2B2c8N%2FYV6hP8YasPbiLGCVCUMjdHY38NyWvZMUbSQhapHRsQeG7y69YeO8dFmd6bWC%2Bu8D5gEnYnaVvjlps5oyW9tkbJ00MP0uM1RfqgMWwIj%2Bc%2FRXqLCAuj%2FF3trWz9w95xQUpVrv%2BSj%2FfaGt1PJ68QD%2BOHYRgRZlKMAD%2Fcafpa3fJFPilZV31rmHWM%2BNXeg%3D%3D";

// Emotion vector format: [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
interface EmotionVector {
  happy: number;
  angry: number;
  sad: number;
  afraid: number;
  disgusted: number;
  melancholic: number;
  surprised: number;
  calm: number;
}

export interface TTSJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: {
    status: string;
    url: string;
  };
  error?: string;
}

/**
 * Generate emotion vector using OpenAI based on script and scene context
 */
export const generateEmotionVector = async (
  script: string,
  sceneContext?: string
): Promise<string> => {
  console.log('🎭 Generating emotion vector with OpenAI...');
  console.log(`📝 Script: ${script.substring(0, 100)}...`);
  if (sceneContext) {
    console.log(`🎬 Scene context: ${sceneContext.substring(0, 100)}...`);
  }

  const prompt = `Analyze the following narration script to determine the PRIMARY emotional tone and delivery style. Consider the narrative context, pacing, and intended mood.

Emotion Vector Format: [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]

Guidelines:
- Natural narration should emphasize ONE or TWO primary emotions (0.5-0.8 range)
- Keep other emotions low (0.0-0.3) for authenticity
- For reflective/contemplative narration: emphasize calm (0.6-0.8) and melancholic (0.3-0.5)
- For exciting/energetic content: emphasize happy (0.5-0.7) and surprised (0.3-0.5)
- For serious/dramatic content: emphasize melancholic (0.5-0.7) and calm (0.4-0.6)
- Avoid mixing conflicting emotions (e.g., high happy + high sad)

${sceneContext ? `Context: ${sceneContext}\n\n` : ''}Script: ${script}

Return ONLY 8 comma-separated numbers (0.0-1.0):`;

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional voice director and emotion analyst. Analyze narration scripts to create natural, authentic emotion profiles. Focus on 1-2 primary emotions that define the delivery style. Return ONLY 8 comma-separated decimal numbers (0.0 to 1.0) representing emotion intensities: [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]. No explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      console.error('❌ OpenAI API error:', response.status);
      // Return default balanced emotion vector
      return '0.3,0.1,0.2,0.1,0.0,0.2,0.1,0.5';
    }

    const data = await response.json();
    const emotionVector = data.choices[0].message.content.trim();
    
    console.log('✅ Generated emotion vector:', emotionVector);
    console.log('📊 Emotion breakdown: [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]');
    
    // Validate format (should be 8 numbers separated by commas)
    const numbers = emotionVector.split(',').map((n: string) => parseFloat(n.trim()));
    if (numbers.length !== 8 || numbers.some(isNaN)) {
      console.warn('⚠️ Invalid emotion vector format, using default');
      return '0.3,0.1,0.2,0.1,0.0,0.2,0.1,0.5';
    }
    
    return emotionVector;
  } catch (error) {
    console.error('❌ Failed to generate emotion vector:', error);
    // Return default balanced emotion vector on error
    return '0.3,0.1,0.2,0.1,0.0,0.2,0.1,0.5';
  }
};

/**
 * Submit a TTS job to RunPod with emotion vector
 */
export const submitTTSJob = async (
  text: string,
  emotionVector: string,
  speakerUrl: string = DEFAULT_SPEAKER_URL
): Promise<string> => {
  console.log('🎤 Submitting TTS job to RunPod...');
  console.log(`📝 Text length: ${text.length} characters`);
  console.log(`� Full Text: ${text}`);
  console.log(`🔊 Speaker URL: ${speakerUrl}`);
  console.log(`🎭 Emotion vector: ${emotionVector}`);
  console.log(`🎭 Emotion breakdown [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]`);
  
  const payload = {
    input: {
      task: "tts_emotion_vector",
      text: text,
      spk_url: speakerUrl,
      emo_vector: emotionVector,
      use_random: false
    }
  };

  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  };

  console.log(`📡 Endpoint: ${RUNPOD_TTS_ENDPOINT}`);
  console.log(`📦 Complete Payload Being Sent:`, JSON.stringify(payload, null, 2));
  console.log(`🔑 Headers:`, {
    ...headers,
    Authorization: `Bearer ${API_KEY.substring(0, 20)}...`
  });

  try {
    const response = await fetch(RUNPOD_TTS_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TTS submission failed: ${response.status}`, errorText);
      throw new Error(`TTS API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ TTS job submitted successfully!');
    console.log('📦 Response data:', JSON.stringify(data, null, 2));

    if (!data.id) {
      console.error('❌ No job ID in response!');
      throw new Error('No job ID returned from API');
    }

    console.log(`🎫 Job ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('❌ TTS job submission failed:', error);
    throw error;
  }
};

/**
 * Check the status of a TTS job
 */
export const checkTTSJobStatus = async (jobId: string): Promise<TTSJobResponse> => {
  const statusUrl = `${RUNPOD_STATUS_ENDPOINT}/${jobId}`;
  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  };

  console.log(`🔍 Checking TTS status for job: ${jobId}`);
  console.log(`📡 Status URL: ${statusUrl}`);

  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: headers
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Status check failed: ${response.status}`, errorText);
      throw new Error(`Status check failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Status response data:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Status check failed:', error);
    throw error;
  }
};

/**
 * Poll TTS job until completion (no timeout - waits indefinitely)
 */
export const pollTTSJobUntilComplete = async (
  jobId: string,
  onProgress?: (status: string) => void,
  intervalMs: number = 2000
): Promise<string> => {
  console.log(`🔄 Polling TTS job ${jobId} (no timeout - waiting until complete)...`);
  
  let attempts = 0;

  while (true) {
    attempts++;
    
    try {
      const status = await checkTTSJobStatus(jobId);
      console.log(`📊 Attempt ${attempts}: Status = ${status.status}`);

      if (onProgress) {
        onProgress(status.status);
      }

      if (status.status === 'COMPLETED') {
        if (status.output && status.output.url) {
          console.log('✅ TTS generation completed!');
          return status.output.url;
        } else {
          throw new Error('Job completed but no audio URL returned');
        }
      }

      if (status.status === 'FAILED') {
        throw new Error(status.error || 'TTS generation failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      
    } catch (error) {
      console.error(`❌ Error polling job (attempt ${attempts}):`, error);
      
      // If it's a FAILED status, throw immediately
      if (error instanceof Error && error.message.includes('failed')) {
        throw error;
      }
      
      // Continue polling on transient errors
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
};

/**
 * Generate audio from text with AI-generated emotion vector (one-shot: submit + poll until complete)
 */
export const generateAudioFromText = async (
  text: string,
  onProgress?: (status: string) => void,
  speakerUrl?: string,
  sceneContext?: string
): Promise<string> => {
  console.log('🎤 Starting TTS generation with emotion analysis...');
  
  // Generate emotion vector using OpenAI
  if (onProgress) {
    onProgress('Analyzing emotions with AI...');
  }
  
  const emotionVector = await generateEmotionVector(text, sceneContext);
  
  // Submit job with emotion vector
  if (onProgress) {
    onProgress('Submitting TTS job...');
  }
  
  const jobId = await submitTTSJob(text, emotionVector, speakerUrl || DEFAULT_SPEAKER_URL);
  
  // Poll until complete
  if (onProgress) {
    onProgress('Waiting for audio generation...');
  }
  
  const audioUrl = await pollTTSJobUntilComplete(jobId, onProgress);
  
  console.log('✅ Audio generated successfully:', audioUrl);
  return audioUrl;
};
