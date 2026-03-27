import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { cjsInterop } from "vite-plugin-cjs-interop";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import fs from "fs";
import path from "path";

function loadConfigTitle(): string {
  try {
    const configPath = path.join(__dirname, "public/config.js");
    if (!fs.existsSync(configPath)) {
      return "Orderly Network";
    }

    const configText = fs.readFileSync(configPath, "utf-8");
    const jsonText = configText
      .replace(/window\.__RUNTIME_CONFIG__\s*=\s*/, "")
      .replace(/;$/, "")
      .trim();

    const config = JSON.parse(jsonText);
    return config.VITE_ORDERLY_BROKER_NAME || "Orderly Network";
  } catch (error) {
    console.warn("Failed to load title from config.js:", error);
    return "Orderly Network";
  }
}

/**
 * Vite plugin to limit the trading points ranking to top 100.
 * Transforms the @orderly.network/trading-points module at build time:
 * - Changes pageSize from 10 to 100
 * - Caps pagination total at 100
 */
function limitPointsRankingTop100Plugin(): Plugin {
  return {
    name: "limit-points-ranking-top100",
    transform(code, id) {
      if (!id.includes("@orderly.network/trading-points")) return;
      return code
        .replace(
          /usePagination\(\{\s*pageSize:\s*10\s*\}\)/,
          "usePagination({ pageSize: 100 })"
        )
        .replace(
          /total:\s*data\?\.meta\?\.total\s*\|\|\s*0/,
          "total: Math.min(data?.meta?.total || 0, 100)"
        );
    },
  };
}

function htmlTitlePlugin(): Plugin {
  const title = loadConfigTitle();
  console.log(`Using title from config.js: ${title}`);

  return {
    name: "html-title-transform",
    transformIndexHtml(html) {
      return html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    },
  };
}

export default defineConfig(() => {
  const basePath = process.env.PUBLIC_PATH || "/";

  return {
    server: {
      open: true,
      host: true,
    },
    base: basePath,
    plugins: [
      react(),
      tsconfigPaths(),
      htmlTitlePlugin(),
      limitPointsRankingTop100Plugin(),
      cjsInterop({
        dependencies: ["bs58", "@coral-xyz/anchor", "lodash"],
      }),
      nodePolyfills({
        include: ["buffer", "crypto", "stream"],
      }),
    ],
    build: {
      outDir: "build/client",
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
  };
});
