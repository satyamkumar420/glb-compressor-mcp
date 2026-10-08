import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import fs from "node:fs/promises";
import path from "node:path";

let cachedIO: NodeIO | null = null;

/**
 * Initialize and cache a configured NodeIO instance with Draco and Meshopt
 */
export async function getGltfIO(): Promise<NodeIO> {
  if (cachedIO) {
    return cachedIO;
  }

  const [decoder, encoder] = await Promise.all([
    draco3d.createDecoderModule(),
    draco3d.createEncoderModule(),
  ]);

  cachedIO = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": decoder,
      "draco3d.encoder": encoder,
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });

  return cachedIO;
}

/**
 * Resolve total input file size on disk (handles single .glb or .gltf with .bin)
 */
export async function resolveAssetSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  let totalBytes = stat.size;

  if (filePath.toLowerCase().endsWith(".gltf")) {
    const dir = path.dirname(filePath);
    const binPath = filePath.replace(/\.gltf$/i, ".bin");
    try {
      const binStat = await fs.stat(binPath);
      totalBytes += binStat.size;
    } catch {
      // .bin might not exist or be named differently
    }
  }

  return totalBytes;
}
