/**
 * Dirname of currently executing webpack output file. (Node targets only)
 */
declare const __webpack_dirname: string;

/**
 * Filename of currently executing webpack output file. (Node targets only)
 */
declare const __webpack_filename: string;

interface NodeModule {
    /**
     * Webpack only: the module ID.
     */
    i: number;
}
