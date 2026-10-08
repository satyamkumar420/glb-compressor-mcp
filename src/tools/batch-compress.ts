import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { compressGlb } from "../engine/compressor.js";
import { formatBytes, calculateSavings } from "../utils/format.js";
import { CompressionPreset, MeshCompressionMethod } from "../types.js";

export const batchCompressShape = {
  directoryPath: z.string().describe("Directory path containing 3D files (.glb, .gltf)"),
  recursive: z.boolean().optional().describe("Whether to search subdirectories recursively. Default is true"),
  preset: z
    .enum(["high_quality", "lossless", "balanced", "aggressive"])
    .optional()
    .describe("Compression preset. Default is 'high_quality'"),
  meshCompression: z
    .enum(["meshopt", "draco", "none"])
    .optional()
    .describe("Geometry compression algorithm. Default is 'meshopt'"),
  textureQuality: z.number().min(1).max(100).optional().describe("WebP texture quality (1-100). Default is 90"),
  overwrite: z.boolean().optional().describe("Whether to overwrite original files. Default is false"),
};

export const batchCompressSchema = z.object(batchCompressShape);

async function find3DFiles(dir: string, recursive: boolean): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      const nested = await find3DFiles(fullPath, recursive);
      files.push(...nested);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".glb" || ext === ".gltf") {
        if (!entry.name.includes(".compressed.")) {
          files.push(fullPath);
        }
      }
    }
  }

  return files;
}

export async function handleBatchCompress(args: unknown) {
  try {
    const validated = batchCompressSchema.parse(args);
    const files = await find3DFiles(validated.directoryPath, validated.recursive ?? true);

    if (files.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No .glb or .gltf files found in ${validated.directoryPath}`,
          },
        ],
      };
    }

    let totalOriginal = 0;
    let totalCompressed = 0;
    const summaries: string[] = [];

    for (const file of files) {
      try {
        const res = await compressGlb(
          file,
          undefined,
          {
            preset: validated.preset as CompressionPreset,
            meshCompression: validated.meshCompression as MeshCompressionMethod,
            textureQuality: validated.textureQuality,
          },
          validated.overwrite ?? false
        );
        totalOriginal += res.originalSizeBytes;
        totalCompressed += res.compressedSizeBytes;
        summaries.push(`- **${path.basename(file)}**: ${res.originalSizeFormatted} → ${res.compressedSizeFormatted} (${res.savedPercentage} saved)`);
      } catch (err) {
        summaries.push(`- **${path.basename(file)}**: ⚠️ Failed (${err instanceof Error ? err.message : String(err)})`);
      }
    }

    const totalSaved = Math.max(0, totalOriginal - totalCompressed);
    const overallRatio = calculateSavings(totalOriginal, totalCompressed);

    const message = [
      `### 📦 Batch 3D Compression Summary`,
      `- **Directory:** \`${validated.directoryPath}\``,
      `- **Files Processed:** ${files.length}`,
      `- **Total Original Size:** ${formatBytes(totalOriginal)}`,
      `- **Total Compressed Size:** ${formatBytes(totalCompressed)}`,
      `- **Total Space Saved:** ${formatBytes(totalSaved)} (**${overallRatio} saved**)`,
      `\n#### Detailed Results:`,
      ...summaries,
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
          text: `[ERROR] Batch compression failed: ${errMessage}`,
        },
      ],
    };
  }
}
