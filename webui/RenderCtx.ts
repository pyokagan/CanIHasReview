import React from 'react';

export interface RenderCtx {
    render<P>(entryPointName: string,
        title: string,
        type: React.SFC<P>,
        props?: React.Attributes & P): void;

    render<P,
        T extends React.Component<P, React.ComponentState>,
        C extends React.ComponentClass<P>>(
        entryPointName: string,
        title: string,
        type: React.ClassType<P, T, C>,
        props?: React.ClassAttributes<T> & P): void;
}

export function isRenderCtx(ctx: any): ctx is RenderCtx {
    return typeof ctx === 'object' &&
        typeof ctx.render === 'function';
}
