export type CompressionPreset =
  | "high_quality"
  | "lossless"
  | "balanced"
  | "aggressive"
  | "custom";

export type MeshCompressionMethod = "meshopt" | "draco" | "none";
export type TextureFormat = "webp" | "jpeg" | "png" | "original";

export interface CompressionOptions {
  preset?: CompressionPreset;
  meshCompression?: MeshCompressionMethod;
  compressTextures?: boolean;
  textureFormat?: TextureFormat;
  textureQuality?: number;
  maxTextureResolution?: number;
  simplify?: boolean;
  simplifyRatio?: number;
  simplifyError?: number;
  weld?: boolean;
  weldTolerance?: number;
  quantize?: boolean;
  prune?: boolean;
  dedup?: boolean;
  reorder?: boolean;
  resample?: boolean;
}

export interface ModelStats {
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  meshCount: number;
  primitiveCount: number;
  vertexCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  animationCount: number;
  skinCount: number;
  extensionsUsed: string[];
  textures: TextureInfo[];
}

export interface TextureInfo {
  name: string;
  mimeType: string;
  byteLength: number;
  byteLengthFormatted: string;
  slots: string[];
}

export interface CompressionResult {
  inputPath: string;
  outputPath: string;
  originalSizeBytes: number;
  originalSizeFormatted: string;
  compressedSizeBytes: number;
  compressedSizeFormatted: string;
  bytesSaved: number;
  bytesSavedFormatted: string;
  savedPercentage: string;
  presetUsed: CompressionPreset;
  meshCompressionUsed: MeshCompressionMethod;
  texturesProcessed: number;
  durationMs: number;
}

export interface ComparisonReport {
  inputPath: string;
  outputPath: string;
  originalSize: string;
  compressedSize: string;
  savings: string;
  geometryDifference: {
    originalVertices: number;
    compressedVertices: number;
    originalTriangles: number;
    compressedTriangles: number;
    trianglesPreserved: boolean;
  };
  textureDifference: {
    originalCount: number;
    compressedCount: number;
    formats: string[];
  };
  visualQualityPreserved: boolean;
}
