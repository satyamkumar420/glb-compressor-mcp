import { z } from "zod";
import { compressGlb } from "../engine/compressor.js";
import { CompressionPreset, MeshCompressionMethod } from "../types.js";

export const compressGlbShape = {
  inputPath: z.string().describe("Absolute or relative path to the .glb or .gltf file"),
  outputPath: z.string().optional().describe("Optional destination path for the compressed .glb file"),
  preset: z
    .enum(["high_quality", "lossless", "balanced", "aggressive", "custom"])
    .optional()
    .describe("Compression preset. Defaults to 'high_quality' (perceptually lossless, 0 visual degradation)"),
  meshCompression: z
    .enum(["meshopt", "draco", "none"])
    .optional()
    .describe("Geometry compression method: 'meshopt' (best compatibility) or 'draco' (highest geometry ratio)"),
  textureQuality: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("WebP texture quality (1-100). Default is 90 for visually lossless results"),
  maxTextureResolution: z
    .number()
    .optional()
    .describe("Optional max texture dimension (e.g. 2048, 1024). Default is original size"),
  simplify: z
    .boolean()
    .optional()
    .describe("Whether to simplify mesh polygon count. Default is false (preserves 100% polygons)"),
  simplifyRatio: z
    .number()
    .min(0.1)
    .max(1.0)
    .optional()
    .describe("Simplification target ratio (e.g. 0.8 for 20% reduction). Only used if simplify is true"),
  overwrite: z
    .boolean()
    .optional()
    .describe("If true, overwrites input file directly. Default is false"),
};

export const compressGlbSchema = z.object(compressGlbShape);

export async function handleCompressGlb(args: unknown) {
  try {
    const validated = compressGlbSchema.parse(args);
    const result = await compressGlb(
      validated.inputPath,
      validated.outputPath,
      {
        preset: validated.preset as CompressionPreset,
        meshCompression: validated.meshCompression as MeshCompressionMethod,
        textureQuality: validated.textureQuality,
        maxTextureResolution: validated.maxTextureResolution,
        simplify: validated.simplify,
        simplifyRatio: validated.simplifyRatio,
      },
      validated.overwrite ?? false
    );

    const message = [
      `### ⚡ GLB Compression Complete`,
      `- **Input:** \`${result.inputPath}\``,
      `- **Output:** \`${result.outputPath}\``,
      `- **Original Size:** ${result.originalSizeFormatted}`,
      `- **Compressed Size:** ${result.compressedSizeFormatted}`,
      `- **Space Saved:** ${result.bytesSavedFormatted} (**${result.savedPercentage} reduction**)`,
      `- **Preset:** \`${result.presetUsed}\` (Visual Quality Preserved)`,
      `- **Mesh Compression:** \`${result.meshCompressionUsed}\``,
      `- **Textures Processed:** ${result.texturesProcessed}`,
      `- **Processing Time:** ${result.durationMs}ms`,
    ].join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: message,
        },
      ],
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `[ERROR] GLB compression failed: ${errMessage}`,
        },
      ],
    };
  }
}
