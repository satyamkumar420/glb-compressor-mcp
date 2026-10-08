import { z } from "zod";
import { compareModels } from "../engine/comparator.js";

export const compareGlbShape = {
  originalPath: z.string().describe("Path to the original 3D file (.glb or .gltf)"),
  compressedPath: z.string().describe("Path to the compressed .glb file"),
};

export const compareGlbSchema = z.object(compareGlbShape);

export async function handleCompareGlb(args: unknown) {
  try {
    const validated = compareGlbSchema.parse(args);
    const rep = await compareModels(validated.originalPath, validated.compressedPath);

    const fidelityBadge = rep.visualQualityPreserved
      ? "✅ **100% VISUAL QUALITY PRESERVED** (Zero polygon loss, textures intact)"
      : "⚠️ Note: Slight polygon or texture difference detected (Simplification applied)";

    const message = [
      `### ⚖️ 3D Model Fidelity & Compression Comparison`,
      `- **Original Model:** \`${rep.inputPath}\` (${rep.originalSize})`,
      `- **Compressed Model:** \`${rep.outputPath}\` (${rep.compressedSize})`,
      `- **Compression Savings:** **${rep.savings}**`,
      `\n#### Quality & Geometry Verification:`,
      `- **Status:** ${fidelityBadge}`,
      `- **Triangles:** ${rep.geometryDifference.originalTriangles.toLocaleString()} (Orig) vs ${rep.geometryDifference.compressedTriangles.toLocaleString()} (Compressed)`,
      `- **Vertices:** ${rep.geometryDifference.originalVertices.toLocaleString()} (Orig) vs ${rep.geometryDifference.compressedVertices.toLocaleString()} (Compressed)`,
      `- **Textures:** ${rep.textureDifference.originalCount} (Orig) vs ${rep.textureDifference.compressedCount} (Compressed)`,
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
          text: `[ERROR] Model comparison failed: ${errMessage}`,
        },
      ],
    };
  }
}
