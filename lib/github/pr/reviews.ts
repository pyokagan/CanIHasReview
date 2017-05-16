/**
 * @module
 * https://developer.github.com/v3/pulls/reviews/
 */
import every from 'lodash/every';
import isObjectLike from 'lodash/isObjectLike';
import * as qs from 'querystringify';
import {
    JsonValidationError,
} from '../errors';
import {
    Fetch,
} from '../fetch';
import {
    forEachPage,
} from '../pagination';
import {
    isMiniPublicUserInfo,
    MiniPublicUserInfo,
} from '../user';

const PrReviewState_obj = {
    'APPROVED': 0,
    'CHANGES_REQUESTED': 0,
    'COMMENTED': 0,
    'DISMISSED': 0,
};
type PrReviewState = keyof typeof PrReviewState_obj;
const PrReviewState = Object.keys(PrReviewState_obj) as PrReviewState[];

/**
 * Represents a review on a pull request.
 */
export interface PrReview {
    id: number;
    user: MiniPublicUserInfo;
    body: string;
    commit_id: string;
    state: PrReviewState;
    html_url: string;
}

/**
 * Returns true if `value` implements {@link PrReview}, otherwise returns false.
 */
export function isPrReview(value: any): value is PrReview {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<PrReview> = value;
    return typeof obj.id === 'number' &&
        isMiniPublicUserInfo(obj.user) &&
        typeof obj.body === 'string' &&
        typeof obj.commit_id === 'string' &&
        typeof obj.state === 'string' &&
        PrReviewState.indexOf(obj.state) >= 0 &&
        typeof obj.html_url === 'string';
}

/**
 * Options for {@link forEachPrReview}.
 */
export interface ForEachPrReviewOptions {
    per_page?: number;
}

/**
 * List reviews on a pull request in chronological order.
 */
export function forEachPrReview(fetch: Fetch, owner: string, repo: string, pr: string | number,
    opts: ForEachPrReviewOptions,
    fn: (review: PrReview) => (Promise<void> | void)): Promise<void>;

/**
 * List reviews on a pull request in chronological order.
 */
export function forEachPrReview(fetch: Fetch, owner: string, repo: string, pr: string | number,
    fn: (review: PrReview) => (Promise<void> | void)): Promise<void>;

export async function forEachPrReview(fetch: Fetch, owner: string, repo: string, pr: string | number,
        optsOrFn: any, fnOrNone?: any): Promise<void> {
    const opts: ForEachPrReviewOptions = fnOrNone ? optsOrFn : {};
    const fn: (review: PrReview) => (Promise<void> | void) = fnOrNone || optsOrFn;
    const query = qs.stringify(opts);
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const prEncoded = encodeURIComponent(String(pr));
    const url = `repos/${ownerEncoded}/${repoEncoded}/pulls/${prEncoded}/reviews${query ? '?' : ''}${query}`;
    await forEachPage(fetch, url, {}, async (json) => {
        if (!Array.isArray(json) || !every(json.map(isPrReview))) {
            throw new JsonValidationError(json);
        }

        for (const prReview of json) {
            const result = fn(prReview);
            if (result) {
                await result;
            }
        }
    });
}

/**
 * List reviews on a pull request in chronological order.
 */
export async function getPrReviews(fetch: Fetch, owner: string, repo: string, pr: string | number,
        opts?: ForEachPrReviewOptions): Promise<PrReview[]> {
    const prReviews: PrReview[] = [];
    await forEachPrReview(fetch, owner, repo, pr, opts || {}, prReview => {
        prReviews.push(prReview);
    });
    return prReviews;
}

/**
 * Summarize reviews on a PR by user.
 * @returns A mapping between username and the latest non-comment review.
 */
export async function summarizePrReviews(fetch: Fetch, owner: string, repo: string, pr: string | number,
        opts?: ForEachPrReviewOptions): Promise<{[login: string]: PrReview}> {
    const summary: {[login: string]: PrReview} = {};
    await forEachPrReview(fetch, owner, repo, pr, opts || {}, prReview => {
        switch (prReview.state) {
        case 'APPROVED':
        case 'CHANGES_REQUESTED':
        case 'DISMISSED':
            summary[prReview.user.login] = prReview;
            break;
        case 'COMMENTED':
            break; // ignore comments
        default:
            throw new Error(`unknown pr review state ${prReview.state}`);
        }
    });
    return summary;
}
