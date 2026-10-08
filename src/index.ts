#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Tool imports
import { compressGlbShape, handleCompressGlb } from "./tools/compress-glb.js";
import { batchCompressShape, handleBatchCompress } from "./tools/batch-compress.js";
import { inspectGlbShape, handleInspectGlb } from "./tools/inspect-glb.js";
import { convertGltfShape, handleConvertGltf } from "./tools/convert-gltf.js";
import { compareGlbShape, handleCompareGlb } from "./tools/compare-glb.js";

/**
 * ⚡ GLB Compressor MCP Server
 * High-fidelity 3D model compression with zero visual quality loss
 */
async function main() {
  const server = new McpServer({
    name: "glb-compressor-mcp",
    version: "1.0.0",
  });

  // 1. Single GLB/glTF Compression
  server.tool(
    "compress_glb",
    "Compress and optimize a .glb or .gltf 3D model with meshopt/draco geometry compression, high-quality WebP textures, and zero polygon quality loss",
    compressGlbShape,
    handleCompressGlb
  );

  // 2. Batch Compression
  server.tool(
    "batch_compress_glb",
    "Batch compress all .glb and .gltf files in a folder recursively or flatly, preserving quality and reporting total saved storage",
    batchCompressShape,
    handleBatchCompress
  );

  // 3. Inspect 3D Model
  server.tool(
    "inspect_glb",
    "Inspect a .glb or .gltf model: polygon count, vertices, textures breakdown, animations, extensions, and compression recommendations",
    inspectGlbShape,
    handleInspectGlb
  );

  // 4. Convert glTF to GLB
  server.tool(
    "convert_gltf_to_glb",
    "Convert a multi-file .gltf model (with separate .bin buffers and external images) into a single, compact, high-performance .glb",
    convertGltfShape,
    handleConvertGltf
  );

  // 5. Compare Models (Fidelity & Savings Verification)
  server.tool(
    "compare_glb",
    "Compare original vs compressed 3D models to verify geometric fidelity, polygon preservation, and file size reduction",
    compareGlbShape,
    handleCompareGlb
  );

  // Start STDIO transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[INFO] GLB Compressor MCP Server running via stdio");
}

main().catch((error) => {
  console.error("[FATAL] GLB Compressor MCP Server error:", error);
  process.exit(1);
});
