import vercelAdapter from '@sveltejs/adapter-vercel';
import autoAdapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isVercel = !!(process.env.VERCEL || process.env.NOW_BUILDER);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isVercel
			? vercelAdapter({ runtime: 'nodejs24.x' })
			: autoAdapter(),
		alias: {
			$lib: './src/lib',
			'$lib/*': './src/lib/*'
		}
	}
};

export default config;
