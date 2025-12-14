// Google Cloud Storage Uploader
// Uploads audio files via Flask backend which handles GCS upload
// Flask server manages authentication and returns public URL

const FLASK_API_BASE = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:4000';

/**
 * Upload audio file to GCS via Flask backend
 * Returns a public URL to the uploaded file
 */
export async function uploadAudioToGCS(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('📤 Uploading audio to GCS via Flask...');
  console.log(`📁 File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  try {
    if (onProgress) onProgress(10);

    // Create FormData with audio file
    const formData = new FormData();
    formData.append('audio', file);
    
    if (onProgress) onProgress(30);

    console.log('📡 Sending to Flask API...');
    
    // Upload to Flask endpoint
    const response = await fetch(`${FLASK_API_BASE}/api/upload-audio`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status}`, errorText);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Upload successful!');
    console.log('📦 Response:', data);
    
    if (onProgress) onProgress(100);

    // Check response format
    if (!data.success || !data.url) {
      throw new Error('Invalid response from server');
    }

    console.log(`🔗 Public URL: ${data.url}`);
    console.log(`📄 Filename: ${data.filename}`);
    
    return data.url;
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw new Error(`Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload base64 image to GCS via Flask backend
 * Converts base64 to blob and uploads
 */
export async function uploadImageToGCS(
  base64Image: string,
  filename: string = 'composed-image.png',
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('📤 Uploading image to GCS via Flask...');
  console.log(`📁 Filename: ${filename}`);
  console.log(`📏 Base64 size: ${(base64Image.length / 1024).toFixed(2)} KB`);
  
  try {
    if (onProgress) onProgress(10);

    // Convert base64 to blob
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const file = new File([blob], filename, { type: 'image/png' });

    console.log(`📦 Converted to file: ${file.size} bytes`);
    
    if (onProgress) onProgress(30);

    // Create FormData with image file
    const formData = new FormData();
    formData.append('audio', file); // Using 'audio' field name for compatibility with Flask endpoint
    
    if (onProgress) onProgress(50);

    console.log('📡 Sending to Flask API...');
    
    // Upload to Flask endpoint
    const response = await fetch(`${FLASK_API_BASE}/api/upload-audio`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status}`, errorText);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Upload successful!');
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    
    if (onProgress) onProgress(100);

    // Check response format
    if (!data.success || !data.url) {
      throw new Error('Invalid response from server');
    }

    console.log(`🔗 Public URL: ${data.url}`);
    console.log(`📄 Filename: ${data.filename}`);
    
    return data.url;
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

