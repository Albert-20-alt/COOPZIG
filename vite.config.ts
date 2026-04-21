import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

function fileWriterPlugin() {
  return {
    name: "file-writer",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/upload-bot") && req.method === "POST") {
          const urlParams = new URLSearchParams(req.url.split("?")[1]);
          const filename = urlParams.get("name") || "uploaded.jpg";
          const dir = path.resolve(__dirname, "./public/images/catalog");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          
          const filePath = path.join(dir, filename);
          const writeStream = fs.createWriteStream(filePath);
          req.pipe(writeStream);
          req.on('end', () => {
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, file: filename }));
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), fileWriterPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
