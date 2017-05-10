/**
 * @module
 * React-based rendering engine (client-side).
 * @see renderServer
 */
import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * Render a React component on the client-side.
 * This should be called in the entry point file `entry.tsx`. e.g.:
 *
 *     if (require.main && String(require.main.i) === String(module.id)) {
 *         renderClient(RootComponent);
 *     }
 *
 * The root component must be the same as the one passed to {@link renderServer}.
 */
export function renderClient<P>(type: React.SFC<P>): void;
export function renderClient<P,
        T extends React.Component<P, React.ComponentState>,
        C extends React.ComponentClass<P>>(
    type: React.ClassType<P, T, C>): void;
export function renderClient(type: any): void {
    const elem = React.createElement(type, __INIT_PROPS);
    ReactDOM.render(elem, document.getElementById('app'));
}

export default renderClient;
