import { Document, Transform } from "@gltf-transform/core";
import {
  weld,
  dedup,
  prune,
  reorder,
  resample,
  meshopt,
  draco,
  simplify,
  quantize,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { getGltfIO, resolveAssetSize } from "./io.js";
import { formatBytes, calculateSavings } from "../utils/format.js";
import {
  CompressionOptions,
  CompressionPreset,
  CompressionResult,
  MeshCompressionMethod,
} from "../types.js";

/**
 * Resolve configuration options based on chosen preset
 */
function resolvePresetOptions(options?: CompressionOptions): Required<CompressionOptions> {
  const preset: CompressionPreset = options?.preset || "high_quality";

  const defaults: Record<CompressionPreset, Required<CompressionOptions>> = {
    high_quality: {
      preset: "high_quality",
      meshCompression: "meshopt",
      compressTextures: true,
      textureFormat: "webp",
      textureQuality: 90,
      maxTextureResolution: 0,
      simplify: false,
      simplifyRatio: 1.0,
      simplifyError: 0.0001,
      weld: true,
      weldTolerance: 0.0001,
      quantize: false,
      prune: true,
      dedup: true,
      reorder: true,
      resample: true,
    },
    lossless: {
      preset: "lossless",
      meshCompression: "none",
      compressTextures: false,
      textureFormat: "original",
      textureQuality: 100,
      maxTextureResolution: 0,
      simplify: false,
      simplifyRatio: 1.0,
      simplifyError: 0.0,
      weld: false,
      weldTolerance: 0.0,
      quantize: false,
      prune: true,
      dedup: true,
      reorder: true,
      resample: false,
    },
    balanced: {
      preset: "balanced",
      meshCompression: "meshopt",
      compressTextures: true,
      textureFormat: "webp",
      textureQuality: 85,
      maxTextureResolution: 2048,
      simplify: false,
      simplifyRatio: 1.0,
      simplifyError: 0.0001,
      weld: true,
      weldTolerance: 0.0001,
      quantize: false,
      prune: true,
      dedup: true,
      reorder: true,
      resample: true,
    },
    aggressive: {
      preset: "aggressive",
      meshCompression: "meshopt",
      compressTextures: true,
      textureFormat: "webp",
      textureQuality: 75,
      maxTextureResolution: 1536,
      simplify: true,
      simplifyRatio: 0.75,
      simplifyError: 0.001,
      weld: true,
      weldTolerance: 0.0005,
      quantize: true,
      prune: true,
      dedup: true,
      reorder: true,
      resample: true,
    },
    custom: {
      preset: "custom",
      meshCompression: options?.meshCompression || "meshopt",
      compressTextures: options?.compressTextures ?? true,
      textureFormat: options?.textureFormat || "webp",
      textureQuality: options?.textureQuality ?? 90,
      maxTextureResolution: options?.maxTextureResolution ?? 0,
      simplify: options?.simplify ?? false,
      simplifyRatio: options?.simplifyRatio ?? 1.0,
      simplifyError: options?.simplifyError ?? 0.0001,
      weld: options?.weld ?? true,
      weldTolerance: options?.weldTolerance ?? 0.0001,
      quantize: options?.quantize ?? false,
      prune: options?.prune ?? true,
      dedup: options?.dedup ?? true,
      reorder: options?.reorder ?? true,
      resample: options?.resample ?? true,
    },
  };

  const selected = defaults[preset];
  return {
    ...selected,
    ...options,
    preset,
  };
}

/**
 * Build texture compression transform with quality and dimension guards
 */
function buildTextureTransform(opts: Required<CompressionOptions>): Transform | null {
  if (!opts.compressTextures || opts.textureFormat === "original") {
    return null;
  }

  const textureOpts: Record<string, unknown> = {
    encoder: sharp,
    targetFormat: opts.textureFormat,
    quality: opts.textureQuality,
  };

  if (opts.maxTextureResolution > 0) {
    textureOpts.resize = [opts.maxTextureResolution, opts.maxTextureResolution];
  }

  return textureCompress(textureOpts);
}

/**
 * Build geometry mesh compression transform (meshopt, draco, or none)
 */
function buildMeshCompressionTransform(method: MeshCompressionMethod): Transform | null {
  if (method === "meshopt") {
    return meshopt({ encoder: MeshoptEncoder });
  }
  if (method === "draco") {
    return draco();
  }
  return null;
}

/**
 * Build array of glTF transforms with strict animation and skin protection
 */
function buildTransformPipeline(opts: Required<CompressionOptions>, doc: Document): Transform[] {
  const transforms: Transform[] = [];
  const root = doc.getRoot();
  const hasRigOrAnimation = root.listAnimations().length > 0 || root.listSkins().length > 0;

  // Safe prune: Never prune skins, animations, or bone nodes
  if (opts.prune) {
    if (hasRigOrAnimation) {
      transforms.push(
        prune({
          propertyTypes: [
            "Mesh",
            "Primitive",
            "PrimitiveTarget",
            "Material",
            "Texture",
            "Accessor",
            "Buffer",
          ],
          keepLeaves: true,
        })
      );
    } else {
      transforms.push(prune());
    }
  }

  if (opts.dedup) transforms.push(dedup());

  // High-precision animation resampling: preserves all TRS channels and curves
  if (opts.resample && root.listAnimations().length > 0) {
    transforms.push(resample({ tolerance: 1e-4 }));
  }

  if (opts.weld) transforms.push(weld());

  // Only simplify static meshes (never deform rigged meshes/skeletons)
  if (opts.simplify && opts.simplifyRatio < 1.0 && !hasRigOrAnimation) {
    transforms.push(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: opts.simplifyRatio,
        error: opts.simplifyError,
      })
    );
  }

  const texTransform = buildTextureTransform(opts);
  if (texTransform) transforms.push(texTransform);

  if (opts.quantize) transforms.push(quantize());

  const meshTransform = buildMeshCompressionTransform(opts.meshCompression);
  if (meshTransform) transforms.push(meshTransform);

  if (opts.reorder) transforms.push(reorder({ encoder: MeshoptEncoder }));

  return transforms;
}

/**
 * Resolve target output file path (always outputs .glb)
 */
function resolveOutputPath(inputPath: string, customOutput?: string, overwrite = false): string {
  if (customOutput) return customOutput;
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);

  // If input is .gltf, output must always be .glb
  if (ext.toLowerCase() === ".gltf") {
    return path.join(dir, `${base}.glb`);
  }

  if (overwrite) return inputPath;
  return path.join(dir, `${base}.compressed.glb`);
}

/**
 * Core compress function for all .glb and .gltf files with animation preservation
 */
export async function compressGlb(
  inputPath: string,
  outputPath?: string,
  options?: CompressionOptions,
  overwrite = false
): Promise<CompressionResult> {
  const startTime = Date.now();
  const opts = resolvePresetOptions(options);
  const io = await getGltfIO();
  const originalSizeBytes = await resolveAssetSize(inputPath);

  const doc = await io.read(inputPath);
  const texturesCount = doc.getRoot().listTextures().length;

  const transforms = buildTransformPipeline(opts, doc);
  if (transforms.length > 0) {
    await doc.transform(...transforms);
  }

  const targetPath = resolveOutputPath(inputPath, outputPath, overwrite);
  const binaryBuffer = await io.writeBinary(doc);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, Buffer.from(binaryBuffer));

  const compressedSizeBytes = binaryBuffer.byteLength;
  const bytesSaved = Math.max(0, originalSizeBytes - compressedSizeBytes);

  return {
    inputPath,
    outputPath: targetPath,
    originalSizeBytes,
    originalSizeFormatted: formatBytes(originalSizeBytes),
    compressedSizeBytes,
    compressedSizeFormatted: formatBytes(compressedSizeBytes),
    bytesSaved,
    bytesSavedFormatted: formatBytes(bytesSaved),
    savedPercentage: calculateSavings(originalSizeBytes, compressedSizeBytes),
    presetUsed: opts.preset,
    meshCompressionUsed: opts.meshCompression,
    texturesProcessed: texturesCount,
    durationMs: Date.now() - startTime,
  };
}
