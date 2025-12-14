// Video Combiner Utility
// Uses Flask API to merge videos with FFmpeg on the server

const FLASK_API_BASE = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:4000';

/**
 * Check if Flask API is available
 */
export const checkFlaskAPI = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${FLASK_API_BASE}/health`, {
      headers: {
        'ngrok-skip-browser-warning': '1'
      }
    });
    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('❌ Flask API not available:', error);
    return false;
  }
};

/**
 * Merge videos using Flask API
 * Sends video URLs to the API which downloads and merges them with FFmpeg
 */
export const mergeVideosWithAPI = async (
  videoUrls: string[],
  onProgress?: (message: string) => void
): Promise<string> => {
  console.log(`🔧 Merging ${videoUrls.length} videos using Flask API...`);
  
  if (videoUrls.length === 0) {
    throw new Error('No video URLs provided');
  }

  if (videoUrls.length === 1) {
    console.log('ℹ️ Only one video, returning as-is');
    return videoUrls[0];
  }

  // Check API health first
  if (onProgress) {
    onProgress('Checking Flask API...');
  }
  
  const isAPIAvailable = await checkFlaskAPI();
  if (!isAPIAvailable) {
    throw new Error('Flask API is not available. Please start the Flask server at http://localhost:4000');
  }

  if (onProgress) {
    onProgress('Sending videos to Flask API for merging...');
  }

  try {
    const response = await fetch(`${FLASK_API_BASE}/api/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify({
        urls: videoUrls
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Videos merged successfully!', data);
    
    if (onProgress) {
      onProgress('Video merge complete!');
    }

    // Return the merged video URL from the Flask API
    return data.output_url;
    
  } catch (error) {
    console.error('❌ Video merging failed:', error);
    throw new Error(`Failed to merge videos: ${error}`);
  }
};

/**
 * Merge video with audio using Flask API
 * Combines a video URL and audio URL into a single video with audio track
 */
export const mergeVideoWithAudio = async (
  videoUrl: string,
  audioUrl: string,
  onProgress?: (message: string) => void
): Promise<string> => {
  console.log('🎵 Merging video with audio using Flask API...');
  console.log(`📹 Video URL: ${videoUrl}`);
  console.log(`🎤 Audio URL: ${audioUrl}`);
  
  // Check API health first
  if (onProgress) {
    onProgress('Checking Flask API...');
  }
  
  const isAPIAvailable = await checkFlaskAPI();
  if (!isAPIAvailable) {
    throw new Error('Flask API is not available. Please start the Flask server at http://localhost:4000');
  }

  if (onProgress) {
    onProgress('Merging video with audio...');
  }

  try {
    const response = await fetch(`${FLASK_API_BASE}/api/video-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify({
        video_url: videoUrl,
        audio_url: audioUrl
      })
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status}`, errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      throw new Error(error.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Video and audio merged successfully!');
    console.log('📦 Response data:', JSON.stringify(data, null, 2));
    
    if (onProgress) {
      onProgress('Merge complete!');
    }

    // Return the merged video URL from the Flask API
    return data.output_url;
    
  } catch (error) {
    console.error('❌ Video/audio merging failed:', error);
    throw new Error(`Failed to merge video with audio: ${error}`);
  }
};

/**
 * Complete workflow: Send video URLs to Flask API for merging
 */
export const downloadAndCombineVideos = async (
  sceneUrls: { sceneNumber: number; url: string }[],
  onProgress?: (stage: string, completed?: number, total?: number) => void
): Promise<string> => {
  try {
    // Extract just the URLs in scene order
    const videoUrls = sceneUrls
      .sort((a, b) => a.sceneNumber - b.sceneNumber)
      .map(scene => scene.url);
    
    console.log(`🎬 Sending ${videoUrls.length} video URLs to Flask API...`);
    
    if (onProgress) {
      onProgress('merging');
    }
    
    // Send to Flask API for server-side FFmpeg merging
    const mergedVideoUrl = await mergeVideosWithAPI(videoUrls, (message) => {
      console.log(message);
      if (onProgress) {
        onProgress('merging');
      }
    });
    
    if (onProgress) {
      onProgress('complete');
    }
    
    return mergedVideoUrl;
    
  } catch (error) {
    console.error('❌ Error in video merge workflow:', error);
    throw error;
  }
};
