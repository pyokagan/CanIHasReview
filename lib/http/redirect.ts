import {
    setHeader,
} from './headers';
import {
    Response,
} from './response';
import {
    setBodyText,
} from './response-body';
import {
    HttpStatus,
} from './status';

export function redirectMovedPermanently(resp: Response, url: string): void {
    setHeader(resp, 'Location', url);
    resp.status = HttpStatus.MOVED_PERMANENTLY;
    setBodyText(resp, `Moved permanently to ${url}\n`);
}

export function redirectSeeOther(resp: Response, url: string): void {
    setHeader(resp, 'Location', url);
    resp.status = HttpStatus.SEE_OTHER;
    setBodyText(resp, `Redirecting to ${url}\n`);
}
