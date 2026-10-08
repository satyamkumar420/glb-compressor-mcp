import { z } from "zod";
import path from "node:path";
import { compressGlb } from "../engine/compressor.js";
import { CompressionPreset } from "../types.js";

export const convertGltfShape = {
  inputPath: z.string().describe("Path to the source .gltf file"),
  outputPath: z.string().optional().describe("Optional output path for the bundled .glb file"),
  compress: z.boolean().optional().describe("Whether to compress while converting to GLB. Default is true"),
  preset: z
    .enum(["high_quality", "lossless", "balanced", "aggressive"])
    .optional()
    .describe("Compression preset. Default is 'high_quality'"),
};

export const convertGltfSchema = z.object(convertGltfShape);

export async function handleConvertGltf(args: unknown) {
  try {
    const validated = convertGltfSchema.parse(args);
    if (!validated.inputPath.toLowerCase().endsWith(".gltf")) {
      throw new Error(`Input path must be a .gltf file: ${validated.inputPath}`);
    }

    const defaultOutput = validated.outputPath || validated.inputPath.replace(/\.gltf$/i, ".glb");
    const shouldCompress = validated.compress ?? true;
    const preset = shouldCompress ? (validated.preset as CompressionPreset || "high_quality") : "lossless";

    const result = await compressGlb(validated.inputPath, defaultOutput, {
      preset,
      compressTextures: shouldCompress,
      meshCompression: shouldCompress ? "meshopt" : "none",
    });

    const message = [
      `### 🔄 glTF to GLB Conversion Complete`,
      `- **Source glTF:** \`${result.inputPath}\``,
      `- **Bundled GLB:** \`${result.outputPath}\``,
      `- **Original Size (glTF + buffers):** ${result.originalSizeFormatted}`,
      `- **Bundled GLB Size:** ${result.compressedSizeFormatted}`,
      `- **Saved Space:** ${result.bytesSavedFormatted} (${result.savedPercentage})`,
      `- **Textures Bundled:** ${result.texturesProcessed}`,
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
          text: `[ERROR] glTF conversion failed: ${errMessage}`,
        },
      ],
    };
  }
}
