import { z } from "zod";
import { inspectModel } from "../engine/inspector.js";

export const inspectGlbShape = {
  filePath: z.string().describe("Path to the .glb or .gltf file to inspect"),
};

export const inspectGlbSchema = z.object(inspectGlbShape);

export async function handleInspectGlb(args: unknown) {
  try {
    const validated = inspectGlbSchema.parse(args);
    const stats = await inspectModel(validated.filePath);

    const textureSummary = stats.textures.length > 0
      ? stats.textures.map((t) => `  - \`${t.name}\`: ${t.mimeType} (${t.byteLengthFormatted}) [${t.slots.join(", ")}]`).join("\n")
      : "  - None";

    const extensionsSummary = stats.extensionsUsed.length > 0
      ? stats.extensionsUsed.map((e) => `  - \`${e}\``).join("\n")
      : "  - None";

    const recommendations: string[] = [];
    if (stats.textureCount > 0) {
      recommendations.push("Textures present: WebP conversion with quality 90 recommended for 50-70% size reduction.");
    }
    if (stats.triangleCount > 50000) {
      recommendations.push("High triangle count (>50k): Meshopt compression recommended for fast web loading.");
    }
    if (stats.animationCount > 0) {
      recommendations.push("Animations detected: Keyframe resampling enabled by default to remove redundant frames.");
    }

    const message = [
      `### 🔍 3D Asset Inspection Report`,
      `- **File:** \`${stats.filePath}\``,
      `- **File Size:** ${stats.fileSizeFormatted}`,
      `- **Meshes:** ${stats.meshCount} (Primitives: ${stats.primitiveCount})`,
      `- **Triangles:** ${stats.triangleCount.toLocaleString()}`,
      `- **Vertices:** ${stats.vertexCount.toLocaleString()}`,
      `- **Materials:** ${stats.materialCount}`,
      `- **Textures:** ${stats.textureCount}`,
      `- **Animations:** ${stats.animationCount}`,
      `- **Skins:** ${stats.skinCount}`,
      `\n#### Textures Breakdown:\n${textureSummary}`,
      `\n#### Extensions Used:\n${extensionsSummary}`,
      `\n#### Optimization Recommendations:`,
      ...recommendations.map((r) => `- 💡 ${r}`),
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
          text: `[ERROR] Inspection failed: ${errMessage}`,
        },
      ],
    };
  }
}
