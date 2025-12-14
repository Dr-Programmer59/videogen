// Image size configurations for different use cases

export interface ImageSize {
  label: string;
  width: number;
  height: number;
  description: string;
}

// Portrait-oriented sizes (good for characters)
export const PORTRAIT_SIZES: ImageSize[] = [
  {
    label: "Portrait - HD (720x1080)",
    width: 720,
    height: 1080,
    description: "Standard portrait, good for characters"
  },
  {
    label: "Portrait - Full HD (1080x1920)",
    width: 1080,
    height: 1920,
    description: "Full HD portrait, detailed characters"
  },
  {
    label: "Portrait - 4K (2160x3840)",
    width: 2160,
    height: 3840,
    description: "Ultra high resolution portrait"
  },
  {
    label: "Square - HD (1024x1024)",
    width: 1024,
    height: 1024,
    description: "Square format, versatile"
  },
  {
    label: "Square - 2K (2048x2048)",
    width: 2048,
    height: 2048,
    description: "High resolution square"
  }
];

// Landscape-oriented sizes (good for environments)
export const LANDSCAPE_SIZES: ImageSize[] = [
  {
    label: "Landscape - HD (1920x1080)",
    width: 1920,
    height: 1080,
    description: "Standard Full HD landscape"
  },
  {
    label: "Landscape - 2K (2560x1440)",
    width: 2560,
    height: 1440,
    description: "2K QHD landscape"
  },
  {
    label: "Landscape - 4K (3840x2160)",
    width: 3840,
    height: 2160,
    description: "Ultra HD 4K landscape"
  },
  {
    label: "Ultrawide - 2K (3440x1440)",
    width: 3440,
    height: 1440,
    description: "Ultrawide panoramic view"
  },
  {
    label: "Cinematic - 2K (2560x1080)",
    width: 2560,
    height: 1080,
    description: "21:9 cinematic ratio"
  },
  {
    label: "Square - HD (1024x1024)",
    width: 1024,
    height: 1024,
    description: "Square format, versatile"
  }
];

// Get size by label
export const getSizeByLabel = (sizes: ImageSize[], label: string): ImageSize | undefined => {
  return sizes.find(size => size.label === label);
};

// Default selections
export const DEFAULT_PORTRAIT_SIZE = "Portrait - HD (720x1080)";
export const DEFAULT_LANDSCAPE_SIZE = "Landscape - HD (1920x1080)";
