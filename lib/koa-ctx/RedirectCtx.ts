/**
 * Context object with `redirect()` method.
 * (part of `Koa.Context`)
 */
export interface RedirectCtx {
    /**
     * Perform a 302 redirect to `url`.
     *
     * The string `back` is special-cased to provide Referrer support.
     * When Referrer is not present `alt` or `/` is used.
     *
     * Examples:
     *
     *     this.redirect('back');
     *     this.redirect('back', '/index.html');
     *     this.redirect('/login');
     *     this.redirect('http://google.com');
     */
    redirect(url: string, alt?: string): void;
}

/**
 * Returns true if `ctx` implements {@link RedirectCtx}, false otherwise.
 */
export function isRedirectCtx(ctx: any): ctx is RedirectCtx {
    return typeof ctx === 'object' &&
        typeof ctx.redirect === 'function';
}
