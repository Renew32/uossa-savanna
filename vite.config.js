import { defineConfig } from 'vite';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
// Build assets from their bytes rather than inheriting metadata from attachments.
function localAssets() {
  return {
    name: 'local-public-assets',
    apply: 'build',
    generateBundle() {
      const root = resolve('public');
      const visit = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = resolve(dir, entry.name);
          if (entry.isDirectory()) visit(path);
          else if (entry.name !== 'uossa-original.jpg') {
            const existing = resolve('build', relative(root, path));
            if (existsSync(existing) && readFileSync(existing).equals(readFileSync(path))) continue;
            this.emitFile({ type: 'asset', fileName: relative(root, path).split('\\').join('/'), source: readFileSync(path) });
          }
        }
      };
      visit(root);
    },
  };
}
export default defineConfig({
  plugins: [localAssets()],
  build: {
    outDir: 'build',
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: { output: { manualChunks: { three: ['three'], motion: ['gsap', 'gsap/ScrollTrigger', 'lenis'] } } },
  },
  server: { port: 5173, strictPort: true },
});
