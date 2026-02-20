import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import type { Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Copies and rewrites manifest.json with compiled JS paths, and copies icons */
function copyExtensionAssets(): Plugin {
    return {
        name: "copy-extension-assets",
        closeBundle() {
            // Read source manifest and rewrite .ts -> .js entry paths
            const manifestSrc = JSON.parse(readFileSync("manifest.json", "utf-8"));
            manifestSrc.background.service_worker = "src/background/index.js";
            manifestSrc.content_scripts[0].js = ["src/content/index.js"];
            manifestSrc.action.default_popup = "src/popup/index.html";

            writeFileSync("dist/manifest.json", JSON.stringify(manifestSrc, null, 2));

            // Icons (copy if present)
            const iconsDir = "dist/icons";
            if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
            for (const size of [16, 48, 128]) {
                const src = `icons/icon${size}.png`;
                if (existsSync(src)) copyFileSync(src, `${iconsDir}/icon${size}.png`);
            }
        },
    };
}

export default defineConfig({
    plugins: [copyExtensionAssets()],
    build: {
        outDir: "dist",
        emptyOutDir: true,
        target: "es2020",
        rollupOptions: {
            input: {
                background: resolve(__dirname, "src/background/index.ts"),
                content: resolve(__dirname, "src/content/index.ts"),
                popup: resolve(__dirname, "src/popup/index.html"),
            },
            output: {
                entryFileNames: (chunk) => {
                    if (chunk.name === "content") return "src/content/index.js";
                    if (chunk.name === "background") return "src/background/index.js";
                    return "[name].js";
                },
                chunkFileNames: "chunks/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
            },
        },
    },
});
