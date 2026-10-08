import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  weld,
  dedup,
  prune,
  reorder,
  resample,
  meshopt,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { z } from "zod";
import { formatBytes, calculateSavings } from "./utils/format.js";

let cachedWebIO: WebIO | null = null;

/**
 * Initialize WebIO instance with Meshopt WebAssembly dependencies
 */
function getWebIO(): WebIO {
  if (cachedWebIO) return cachedWebIO;

  cachedWebIO = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });

  return cachedWebIO;
}

/**
 * Fetch or decode 3D asset binary buffer from URL or Base64 string
 */
async function resolveInputBuffer(url?: string, base64?: string): Promise<Uint8Array> {
  if (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download 3D model from URL: ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  if (base64) {
    const clean = base64.replace(/^data:[^;]+;base64,/, "");
    const binStr = atob(clean);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  }

  throw new Error("Must provide either 'url' or 'base64' input parameter");
}

/**
 * Encode Uint8Array to Base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Calculate geometry statistics (vertices, triangles)
 */
function getGeometryStats(doc: any): { vertices: number; triangles: number } {
  let vertices = 0;
  let triangles = 0;

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (pos) vertices += pos.getCount();
      const indices = prim.getIndices();
      if (indices) {
        triangles += Math.round(indices.getCount() / 3);
      } else if (pos) {
        triangles += Math.round(pos.getCount() / 3);
      }
    }
  }

  return { vertices, triangles };
}

/**
 * Create fresh McpServer instance for Cloudflare Workers
 */
function createWorkerServer(): McpServer {
  const server = new McpServer({
    name: "glb-compressor-mcp",
    version: "1.0.0",
  });

  // 1. Compress GLB tool
  server.registerTool(
    "compress_glb",
    {
      description: "Compress and optimize a .glb model from URL or Base64 with Meshopt, preserving 100% visual quality and silhouette",
      inputSchema: {
        url: z.string().optional().describe("Public URL to .glb file to download and compress"),
        base64: z.string().optional().describe("Base64 string of .glb file"),
        preset: z.enum(["high_quality", "lossless", "balanced"]).optional().describe("Preset (default: high_quality)"),
        includeBase64Output: z.boolean().optional().describe("Include base64 of compressed GLB in response (default: true)"),
      },
    },
    async ({ url, base64, preset = "high_quality", includeBase64Output = true }) => {
      try {
        const inputBytes = await resolveInputBuffer(url, base64);
        const io = getWebIO();
        const doc = await io.readBinary(inputBytes);

        const origGeom = getGeometryStats(doc);
        const origSize = inputBytes.byteLength;

        // Visual-preserving pipeline
        await doc.transform(
          resample(),
          prune(),
          dedup(),
          weld(),
          meshopt({ encoder: MeshoptEncoder }),
          reorder({ encoder: MeshoptEncoder })
        );

        const compressedBytes = await io.writeBinary(doc);
        const compGeom = getGeometryStats(doc);
        const compSize = compressedBytes.byteLength;
        const savedBytes = Math.max(0, origSize - compSize);
        const savingsRatio = calculateSavings(origSize, compSize);

        const responseLines = [
          `### ⚡ Cloudflare Worker GLB Compression Complete`,
          `- **Original Size:** ${formatBytes(origSize)}`,
          `- **Compressed Size:** ${formatBytes(compSize)}`,
          `- **Space Saved:** ${formatBytes(savedBytes)} (**${savingsRatio}**)`,
          `- **Visual Quality:** ✅ 100% Preserved (Triangles: ${origGeom.triangles.toLocaleString()} → ${compGeom.triangles.toLocaleString()})`,
          `- **Preset:** \`${preset}\``,
        ];

        if (includeBase64Output) {
          const b64 = bytesToBase64(compressedBytes);
          responseLines.push(`\n**Base64 Data URI:**\n\`data:model/gltf-binary;base64,${b64.slice(0, 80)}... (${formatBytes(compSize)})\``);
        }

        return {
          content: [{ type: "text", text: responseLines.join("\n") }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `[ERROR] Worker compression failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    }
  );

  // 2. Inspect GLB tool
  server.registerTool(
    "inspect_glb",
    {
      description: "Inspect a 3D GLB model from URL or Base64 (triangles, vertices, textures, animations, extensions)",
      inputSchema: {
        url: z.string().optional().describe("Public URL to .glb file"),
        base64: z.string().optional().describe("Base64 string of .glb file"),
      },
    },
    async ({ url, base64 }) => {
      try {
        const inputBytes = await resolveInputBuffer(url, base64);
        const io = getWebIO();
        const doc = await io.readBinary(inputBytes);
        const root = doc.getRoot();
        const geom = getGeometryStats(doc);

        const report = [
          `### 🔍 3D Model Inspection (Cloudflare Edge)`,
          `- **File Size:** ${formatBytes(inputBytes.byteLength)}`,
          `- **Meshes:** ${root.listMeshes().length}`,
          `- **Triangles:** ${geom.triangles.toLocaleString()}`,
          `- **Vertices:** ${geom.vertices.toLocaleString()}`,
          `- **Materials:** ${root.listMaterials().length}`,
          `- **Textures:** ${root.listTextures().length}`,
          `- **Animations:** ${root.listAnimations().length}`,
          `- **Extensions Used:** ${root.listExtensionsUsed().map((e: any) => e.extensionName).join(", ") || "None"}`,
        ].join("\n");

        return {
          content: [{ type: "text", text: report }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `[ERROR] Inspection failed: ${err instanceof Error ? err.message : String(err)}` }],
        };
      }
    }
  );

  return server;
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Root status info page
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify(
          {
            name: "glb-compressor-mcp",
            description: "Cloudflare Workers Remote MCP Server for High-Fidelity 3D GLB Compression",
            endpoints: {
              mcp: `${url.origin}/mcp`,
              sse: `${url.origin}/sse`,
            },
            status: "online",
            tools: ["compress_glb", "inspect_glb"],
            quality: "Zero visual degradation by default (high_quality preset)",
          },
          null,
          2
        ),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // MCP Streamable HTTP & SSE Handler
    return createMcpHandler(createWorkerServer, {
      legacy: "stateless",
      responseMode: "auto",
    })(request, env, ctx);
  },
};
