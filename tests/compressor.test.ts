import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { inspectModel } from "../src/engine/inspector.js";
import { compressGlb } from "../src/engine/compressor.js";
import { compareModels } from "../src/engine/comparator.js";
import { handleConvertGltf } from "../src/tools/convert-gltf.js";

const TEST_ASSETS_DIR = "/home/sarthaks/Desktop/new-games/08-oct-game/public/assets";
const TEST_GLB = path.join(TEST_ASSETS_DIR, "Pistol.glb");
const TEST_GLTF = path.join(TEST_ASSETS_DIR, "AnimationLibrary_Godot_Standard.gltf");
const TEMP_OUTPUT = "/tmp/test_compressed_pistol.glb";
const TEMP_GLTF_OUTPUT = "/tmp/test_converted_anim.glb";

describe("GLB Compressor Engine", () => {
  describe("inspectModel", () => {
    it("should inspect a valid GLB model and return accurate geometry statistics", async () => {
      const stats = await inspectModel(TEST_GLB);
      expect(stats.meshCount).toBeGreaterThan(0);
      expect(stats.vertexCount).toBeGreaterThan(0);
      expect(stats.triangleCount).toBeGreaterThan(0);
      expect(stats.fileSizeBytes).toBeGreaterThan(0);
    });

    it("should throw an error when inspecting a non-existent file", async () => {
      await expect(inspectModel("/tmp/non_existent_file.glb")).rejects.toThrow();
    });
  });

  describe("compressGlb", () => {
    it("should compress a GLB file while preserving visual quality and reducing size", async () => {
      const result = await compressGlb(TEST_GLB, TEMP_OUTPUT, {
        preset: "high_quality",
      });

      expect(result.compressedSizeBytes).toBeLessThan(result.originalSizeBytes);
      expect(result.outputPath).toBe(TEMP_OUTPUT);

      // Verify geometry fidelity
      const comparison = await compareModels(TEST_GLB, TEMP_OUTPUT);
      expect(comparison.geometryDifference.trianglesPreserved).toBe(true);
      expect(comparison.visualQualityPreserved).toBe(true);

      // Clean up
      await fs.unlink(TEMP_OUTPUT).catch(() => {});
    });

    it("should fail gracefully when given an invalid input path", async () => {
      await expect(
        compressGlb("/tmp/invalid_ghost_file.glb", "/tmp/out.glb")
      ).rejects.toThrow();
    });
  });

  describe("convertGltfToGlb", () => {
    it(
      "should convert multi-file glTF to a single self-contained compressed GLB",
      async () => {
      const res = await handleConvertGltf({
        inputPath: TEST_GLTF,
        outputPath: TEMP_GLTF_OUTPUT,
      });

      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Conversion Complete");

      // Verify converted GLB is valid and readable
      const stats = await inspectModel(TEMP_GLTF_OUTPUT);
      expect(stats.fileSizeBytes).toBeGreaterThan(0);

      // Clean up
      await fs.unlink(TEMP_GLTF_OUTPUT).catch(() => {});
    }, 15000);

    it("should reject non-gltf files", async () => {
      const res = await handleConvertGltf({
        inputPath: TEST_GLB, // Pistol.glb is not a .gltf
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("Input path must be a .gltf file");
    });
  });
});
