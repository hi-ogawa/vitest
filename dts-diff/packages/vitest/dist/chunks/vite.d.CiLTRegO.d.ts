import { I as InlineConfig } from './reporters.d.B7yh0dEk.js';

type VitestInlineConfig = InlineConfig;
declare module "vite" {
	interface UserConfig {
		/**
		* Options for Vitest
		*/
		test?: VitestInlineConfig;
	}
}
