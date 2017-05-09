/**
 * Dirname of currently executing webpack output file. (Node targets only)
 */
declare const __webpack_dirname: string;

/**
 * Filename of currently executing webpack output file. (Node targets only)
 */
declare const __webpack_filename: string;

/**
 * True if running in the mocha-webpack test environment.
 */
declare const __webpack_mocha: boolean;

interface NodeModule {
    /**
     * Webpack only: the module ID.
     */
    i: number;
}
