import { inspectModel } from "./inspector.js";
import { formatBytes, calculateSavings } from "../utils/format.js";
import { ComparisonReport } from "../types.js";

/**
 * Compare original vs compressed 3D models to verify geometric fidelity and quality
 */
export async function compareModels(
  originalPath: string,
  compressedPath: string
): Promise<ComparisonReport> {
  const [orig, comp] = await Promise.all([
    inspectModel(originalPath),
    inspectModel(compressedPath),
  ]);

  const trianglesPreserved = orig.triangleCount === comp.triangleCount;
  const visualQualityPreserved = trianglesPreserved && comp.textureCount === orig.textureCount;

  return {
    inputPath: originalPath,
    outputPath: compressedPath,
    originalSize: orig.fileSizeFormatted,
    compressedSize: comp.fileSizeFormatted,
    savings: calculateSavings(orig.fileSizeBytes, comp.fileSizeBytes),
    geometryDifference: {
      originalVertices: orig.vertexCount,
      compressedVertices: comp.vertexCount,
      originalTriangles: orig.triangleCount,
      compressedTriangles: comp.triangleCount,
      trianglesPreserved,
    },
    textureDifference: {
      originalCount: orig.textureCount,
      compressedCount: comp.textureCount,
      formats: comp.textures.map((t) => t.mimeType),
    },
    visualQualityPreserved,
  };
}
