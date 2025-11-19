import path from "path";
import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from 'url';

const logger = createLogger();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'guard-logger',
      configResolved() {
        logger.info('🛡️ ProtectedRoute Guard Logger Plugin Loaded');
        logger.warn('⚠️  Watching for guard component activity...');
      },
      transform(code, id) {
        // Log when ProtectedRoute component is transformed/loaded
        if (id.includes('ProtectedRoute.tsx')) {
          logger.info('🎯 ProtectedRoute component loaded: ' + id.split('/').pop());
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: parseInt(process.env.PORT || "9011"),
    host: true, // Better than allowedHosts for development
    allowedHosts: ["test.mtsk.app"],
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_GATEWAY_PORT || '9501'}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});