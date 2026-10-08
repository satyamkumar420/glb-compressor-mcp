<p align="center">
  <img src="./assets/banner.svg" alt="GLB Compressor MCP Banner" width="100%" />
</p>

# ⚡ GLB Compressor MCP Server

> High-fidelity, local 3D model compression and optimization Model Context Protocol (MCP) server with **zero visual quality degradation** and **instant live auto-reload**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Runtime: Node.js](https://img.shields.io/badge/Runtime-Node.js%20%7C%20TSX-green.svg)](https://nodejs.org/)
[![Protocol](https://img.shields.io/badge/Protocol-MCP%20Stdio%20Transport-brightgreen.svg)](https://modelcontextprotocol.io/)

---

## 🌟 Highlights

- **🛡️ 100% Visual Quality Preservation:** Preserves silhouette, vertex attributes, polygons, and textures without destructive loss. Zero polygon loss by default (`simplify: false`).
- **⚡ Live Auto-Reload (No Manual Builds):** Executes directly via TypeScript (`tsx`). Any changes made in `src/` take effect immediately without requiring `tsc` or `build` commands.
- **🎬 Full Animation & Rigging Safeguards:** Smart Pruning protects skeletons, bones, and animation tracks from accidental deletion. High-precision keyframe resampling (`tolerance: 1e-4`) retains smooth motion curves.
- **📦 Multi-Format 3D Support:** Reads `.glb` and multi-file `.gltf` (with separate `.bin` buffers and image textures), consolidating and outputting highly optimized binary `.glb`.
- **🚀 Advanced Pipeline:**
  - Meshopt WebAssembly geometry compression (`EXT_meshopt_compression`)
  - Google Draco compression (`KHR_draco_mesh_compression`)
  - Duplicate vertex welding (`weld`)
  - Unused node, mesh, and buffer pruning (`prune`) with animation/skin protection
  - Accessor and texture deduplication (`dedup`)
  - Animation keyframe resampling (`resample`)
  - GPU vertex cache & fetch reordering (`reorder`)
  - High-fidelity WebP texture compression (`EXT_texture_webp`) via native `sharp`

---

## 🛠️ MCP Tools Overview

### 1. `compress_glb`
Compresses and optimizes a 3D model from a local file path (`.glb` or `.gltf`) with guaranteed geometry fidelity.
- **Arguments:**
  - `inputPath` *(string, required)*: Path to the `.glb` or `.gltf` file
  - `outputPath` *(string, optional)*: Destination path (defaults to `<name>.compressed.glb`)
  - `preset` *(enum)*: `"high_quality"` (default), `"lossless"`, `"balanced"`, `"aggressive"`, `"custom"`
  - `meshCompression` *(enum)*: `"meshopt"` (default), `"draco"`, `"none"`
  - `textureQuality` *(number, 1-100)*: WebP quality (default: `90`)
  - `overwrite` *(boolean)*: Whether to overwrite the input file

### 2. `convert_gltf_to_glb`
Packs multi-file `.gltf` files with external `.bin` buffers and image textures into a single self-contained optimized `.glb`.
- **Arguments:**
  - `inputPath` *(string, required)*: Path to the source `.gltf` file
  - `outputPath` *(string, optional)*: Destination `.glb` path
  - `compress` *(boolean)*: Whether to compress while bundling (default: `true`)
  - `preset` *(enum)*: `"high_quality"` (default), `"lossless"`, `"balanced"`

### 3. `batch_compress_glb`
Recursively or flatly traverses a local folder to compress all `.glb` and `.gltf` files in-place or into `.compressed.glb`.
- **Arguments:**
  - `directoryPath` *(string, required)*: Target folder path
  - `recursive` *(boolean)*: Whether to search subdirectories (default: `true`)
  - `preset` *(enum)*: Compression preset
  - `overwrite` *(boolean)*: Overwrite original files

### 4. `inspect_glb`
Inspects 3D asset metadata without modifying it.
- **Arguments:**
  - `filePath` *(string, required)*: Path to `.glb` or `.gltf` file
- **Outputs:** Polygon count, vertices, textures breakdown, animations, skins, materials, and extensions used.

### 5. `compare_glb`
Compares original vs compressed models to verify exact polygon counts, texture retention, and byte savings.
- **Arguments:**
  - `originalPath` *(string, required)*
  - `compressedPath` *(string, required)*

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/satyamkumar420/glb-compressor-mcp.git
cd glb-compressor-mcp
pnpm install
```

### Build & Test

```bash
pnpm build
pnpm test
```

### Development Mode (Direct TSX)

```bash
pnpm dev
```

---

## ⚙️ MCP Client Configuration

### Claude Desktop / AGY / Cursor / Windsurf

Add the following to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "glb-compressor": {
      "command": "node",
      "args": [
        "/absolute/path/to/glb-compressor-mcp/node_modules/tsx/dist/cli.mjs",
        "/absolute/path/to/glb-compressor-mcp/src/index.ts"
      ]
    }
  }
}
```

> **Note:** By executing through `tsx`, any changes made to `src/` immediately take effect without running `build`.

---

## ☕ Support & Sponsor

If you find **GLB Compressor MCP** helpful and want to support its maintenance:

<div align="center">

<a href="https://buymeacoffee.com/satyam404" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200" />
</a>

<br/><br/>

<a href="https://buymeacoffee.com/satyam404" target="_blank">
  <img src="./assets/bmc_qr.png" alt="Scan to Buy Me A Coffee" width="170" style="border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);" />
</a>

<br/>

<sub>Scan the QR code or click the button above to buy me a coffee! Thank you for your support! ☕✨</sub>

</div>

---

## 👤 Author

**Satyam Kumar**
- GitHub: [@satyamkumar420](https://github.com/satyamkumar420)
- LinkedIn: [satyamkumar404](https://www.linkedin.com/in/satyamkumar404/)
- Portfolio: [satyam404.vercel.app](https://satyam404.vercel.app)

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
