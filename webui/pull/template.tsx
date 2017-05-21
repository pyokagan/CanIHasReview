import React from 'react';
import {
    Container,
} from 'reactstrap';
import { PrInfo } from '../../lib/github';
import { RepoTemplate } from '../repo/template';
import { TemplateProps } from '../template';

export interface BodyBlockProps {
    body: string;
    scrollable?: boolean;
}

export function BodyBlock(props: BodyBlockProps): JSX.Element {
    const className = ['p-3'];
    if (props.scrollable) {
        className.push('pre-scrollable');
    }
    return <pre className={className.join(' ')} style={{backgroundColor: 'rgb(246, 248, 250)', borderRadius: '4px'}}>
        <code>{props.body}</code>
    </pre>;
}

interface PrStateProps {
    state: 'open' | 'closed';
    merged: boolean;
}

function PrState(props: PrStateProps): JSX.Element {
    let statusText: string, statusColor: string;
    if (props.merged) {
        statusText = 'Merged';
        statusColor = '#6f42c1';
    } else if (props.state === 'closed') {
        statusText = 'Closed';
        statusColor = '#cb2431';
    } else {
        statusText = 'Open';
        statusColor = '#2cbe4e';
    }
    const style: React.CSSProperties = {
        backgroundColor: statusColor,
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
    };
    return <div className='py-1 px-2 mr-2' style={style}>
        {statusText}
    </div>;
}

interface PrStatusLineProps {
    prInfo: PrInfo;
}

function PrStatusLine(props: PrStatusLineProps): JSX.Element {
    const { prInfo } = props;
    const { user, base, head, merged, commits } = prInfo;
    const numCommits = `${commits} ${ commits === 1 ? 'commit' : 'commits' }`;
    let message: JSX.Element;
    if (merged) {
        const mergedBy = prInfo.merged_by ? prInfo.merged_by.login : 'unknown';
        message = <div>{mergedBy} merged {numCommits} into <code>{base.label}</code> from
            <code>{head.label}</code></div>;
    } else {
        message = <div>{user.login} wants to merge {numCommits} into <code>{base.label}</code> from
            <code>{head.label}</code></div>;
    }
    return <div className='d-flex flex-column justify-content-center'>
        <div className='text-muted' style={{fontSize: '0.8rem'}}>
            {message}
        </div>
    </div>;
}

export interface PrTemplateProps extends TemplateProps {
    prInfo: PrInfo;
}

export class PrTemplate extends React.Component<PrTemplateProps, {}> {
    render(): JSX.Element {
        const { children, prInfo, ...other } = this.props;
        return <RepoTemplate repoInfo={prInfo.base.repo} {...other}>
            <Container>
                <header className='container mb-4'>
                    <h2 className='mb-3'>
                        <span>{prInfo.title}&nbsp;</span>
                        <span className='text-muted'>#{prInfo.number}</span>
                    </h2>
                    <div className='d-flex flex-row flex-wrap'>
                        <PrState state={prInfo.state} merged={prInfo.merged} />
                        <PrStatusLine prInfo={prInfo} />
                    </div>
                    <hr />
                </header>
                {children}
            </Container>
        </RepoTemplate>;
    }
}
