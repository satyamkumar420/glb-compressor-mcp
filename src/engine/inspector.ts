import { Document, Texture } from "@gltf-transform/core";
import { listTextureSlots } from "@gltf-transform/functions";
import { getGltfIO, resolveAssetSize } from "./io.js";
import { formatBytes } from "../utils/format.js";
import { ModelStats, TextureInfo } from "../types.js";

/**
 * Extract texture metadata from a glTF document
 */
function extractTextures(doc: Document): TextureInfo[] {
  return doc.getRoot().listTextures().map((texture: Texture) => {
    const img = texture.getImage();
    const byteLength = img ? img.byteLength : 0;
    return {
      name: texture.getName() || "unnamed",
      mimeType: texture.getMimeType() || "unknown",
      byteLength,
      byteLengthFormatted: formatBytes(byteLength),
      slots: listTextureSlots(texture),
    };
  });
}

/**
 * Calculate geometry vertices and triangles across all primitives
 */
function calculateGeometry(doc: Document): { vertices: number; triangles: number; primitives: number } {
  let vertices = 0;
  let triangles = 0;
  let primitives = 0;

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      primitives += 1;
      const pos = prim.getAttribute("POSITION");
      if (pos) {
        vertices += pos.getCount();
      }
      const indices = prim.getIndices();
      if (indices) {
        triangles += Math.round(indices.getCount() / 3);
      } else if (pos) {
        triangles += Math.round(pos.getCount() / 3);
      }
    }
  }

  return { vertices, triangles, primitives };
}

/**
 * Inspect any GLB or glTF file and return comprehensive asset statistics
 */
export async function inspectModel(filePath: string): Promise<ModelStats> {
  const io = await getGltfIO();
  const doc = await io.read(filePath);
  const root = doc.getRoot();
  const fileSizeBytes = await resolveAssetSize(filePath);
  const geom = calculateGeometry(doc);
  const textures = extractTextures(doc);

  return {
    filePath,
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    meshCount: root.listMeshes().length,
    primitiveCount: geom.primitives,
    vertexCount: geom.vertices,
    triangleCount: geom.triangles,
    materialCount: root.listMaterials().length,
    textureCount: textures.length,
    animationCount: root.listAnimations().length,
    skinCount: root.listSkins().length,
    extensionsUsed: root.listExtensionsUsed().map((ext) => ext.extensionName),
    textures,
  };
}
