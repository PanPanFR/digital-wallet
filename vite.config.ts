import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
	root: 'web',
	publicDir: path.resolve(__dirname, 'static'),
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'web/src'),
			'@shared': path.resolve(__dirname, 'shared')
		}
	},
	build: {
		outDir: path.resolve(__dirname, 'dist'),
		emptyOutDir: true
	},
	server: {
		// `wrangler dev` (port 8787) serves the API; Vite serves the SPA with HMR.
		proxy: {
			'/api': 'http://localhost:8787'
		}
	}
});
