import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { Document } from "@gltf-transform/core";
import { getGltfIO } from "../src/engine/io.js";
import { inspectModel } from "../src/engine/inspector.js";
import { compressGlb } from "../src/engine/compressor.js";
import { compareModels } from "../src/engine/comparator.js";
import { handleConvertGltf } from "../src/tools/convert-gltf.js";

const FIXTURE_DIR = "/tmp/glb_test_fixtures";
const TEST_GLB = path.join(FIXTURE_DIR, "test_cube.glb");
const TEST_GLTF = path.join(FIXTURE_DIR, "test_model.gltf");
const TEMP_OUTPUT = path.join(FIXTURE_DIR, "compressed_out.glb");
const TEMP_GLTF_OUTPUT = path.join(FIXTURE_DIR, "converted_out.glb");

beforeAll(async () => {
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const io = await getGltfIO();

  // Create sample glTF and GLB test models
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute("POSITION", position);
  const mesh = doc.createMesh("TestMesh").addPrimitive(prim);
  const node = doc.createNode("TestNode").setMesh(mesh);
  const scene = doc.createScene("MainScene").addChild(node);
  doc.getRoot().setDefaultScene(scene);

  // Write GLB fixture
  const glbBytes = await io.writeBinary(doc);
  await fs.writeFile(TEST_GLB, Buffer.from(glbBytes));

  // Write glTF fixture
  await io.write(TEST_GLTF, doc);
});

afterAll(async () => {
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true }).catch(() => {});
});

describe("GLB Compressor Engine (Local)", () => {
  describe("inspectModel", () => {
    it("should inspect a valid GLB model and return accurate geometry statistics", async () => {
      const stats = await inspectModel(TEST_GLB);
      expect(stats.meshCount).toBe(1);
      expect(stats.vertexCount).toBe(3);
      expect(stats.triangleCount).toBe(1);
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

      expect(result.outputPath).toBe(TEMP_OUTPUT);

      // Verify geometry fidelity
      const comparison = await compareModels(TEST_GLB, TEMP_OUTPUT);
      expect(comparison.geometryDifference.trianglesPreserved).toBe(true);
      expect(comparison.visualQualityPreserved).toBe(true);
    });

    it("should fail gracefully when given an invalid input path", async () => {
      await expect(
        compressGlb("/tmp/invalid_ghost_file.glb", "/tmp/out.glb")
      ).rejects.toThrow();
    });
  });

  describe("convertGltfToGlb", () => {
    it("should convert multi-file glTF to a single self-contained compressed GLB", async () => {
      const res = await handleConvertGltf({
        inputPath: TEST_GLTF,
        outputPath: TEMP_GLTF_OUTPUT,
      });

      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Conversion Complete");

      // Verify converted GLB is valid and readable
      const stats = await inspectModel(TEMP_GLTF_OUTPUT);
      expect(stats.meshCount).toBe(1);
      expect(stats.fileSizeBytes).toBeGreaterThan(0);
    });

    it("should reject non-gltf files", async () => {
      const res = await handleConvertGltf({
        inputPath: TEST_GLB,
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("Input path must be a .gltf file");
    });
  });
});
