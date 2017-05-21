/**
 * The public URL address of the output assets when referenced in a browser.
 */
export const publicPath: string;

/**
 * Output directory of the public assets relative to the `server.js` directory.
 */
export const publicOutputDir: string;

/**
 * Repo configuration.
 */
export interface RepoConfig {
    addLabelsOnSubmit?: string[];
    removeLabelsOnSubmit?: string[];
    checks?: string[];
}

/**
 * Supported repo configs.
 */
export const repoConfigs: {[fullName: string]: RepoConfig};
