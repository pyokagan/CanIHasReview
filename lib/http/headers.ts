/**
 * @module
 * HTTP headers support.
 */

type HeaderBag = {
    headers: Map<string, string[]>;
};

export function getHeader(bag: HeaderBag, name: string): string[] {
    const hdrs = bag.headers;
    name = toHeaderCase(name);
    const values = hdrs.get(name);
    return values ? values.slice(0) : [];
}

export function setHeader(bag: HeaderBag, name: string, value: string | string[]): void {
    const hdrs = bag.headers;
    name = toHeaderCase(name);
    const arrayValue = typeof value === 'string' ? [value] : value;
    if (arrayValue.length > 0) {
        hdrs.set(name, arrayValue);
    } else {
        hdrs.delete(name);
    }
}

export function appendHeader(bag: HeaderBag, name: string, value: string): void {
    const hdrs = bag.headers;
    name = toHeaderCase(name);
    const values = hdrs.get(name) || [];
    values.push(value);
    hdrs.set(name, values);
}

export function deleteHeader(bag: HeaderBag, name: string): boolean {
    const hdrs = bag.headers;
    name = toHeaderCase(name);
    return hdrs.delete(name);
}

function toHeaderCase(name: string): string {
    return name.toLowerCase();
}
