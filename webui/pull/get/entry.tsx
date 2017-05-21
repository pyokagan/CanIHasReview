import {
    getCommitMessageBody,
    getCommitMessageSubject,
} from '@lib/git/util';
import * as github from '@lib/github';
import * as prcheck from '@lib/prcheck';
import renderClient from '@webui/renderClient';
import isEmpty from 'lodash/isEmpty';
import React from 'react';
import {
    Alert,
} from 'reactstrap';
import {
    BodyBlock,
    PrTemplate,
    PrTemplateProps,
} from '../template';

interface CardProps extends JSX.ElementChildrenAttribute {
    heading: string;
}

function Card(props: CardProps): JSX.Element {
    return <section className='card'>
        <div className='card-body'>
            <h1 className='card-title mb-3 pb-2'
                    style={{borderBottom: '1px lightgray solid', fontSize: '1.6rem'}}>
                {props.heading}
            </h1>
            {props.children}
        </div>
    </section>;
}

interface CommitItemProps {
    /** Commit number */
    idx: number;
    /** Total number of commits */
    total: number;
    commit: github.GithubCommit;
}

function CommitItem(props: CommitItemProps): JSX.Element {
    const nr = `${props.idx + 1}/${props.total}`;
    const subject = getCommitMessageSubject(props.commit.commit.message);
    return <details>
        <summary>[{nr}] <a href={props.commit.html_url}>{subject}</a></summary>
        <BodyBlock body={getCommitMessageBody(props.commit.commit.message)} />
    </details>;
}

interface CommitListProps {
    prCommits: github.GithubCommit[];
}

function CommitList(props: CommitListProps): JSX.Element {
    const commits: JSX.Element[] = props.prCommits.map(
        (commit, idx) => <CommitItem commit={commit} idx={idx} total={props.prCommits.length} key={String(idx)} />,
    );
    return <div>{commits}</div>;
}

interface PrCheckErrorsViewProps {
    prCheckResult: prcheck.PrCheckResult;
}

function PrCheckErrorsView(props: PrCheckErrorsViewProps): JSX.Element | null {
    if (isEmpty(props.prCheckResult)) {
        return null;
    }

    const checks = (props.prCheckResult[''] || []).map((msg, idx) => {
        return <li key={String(idx)}>{msg}</li>;
    });

    return <section className='alert alert-danger'>
        <h1 style={{fontSize: '1.2rem', fontWeight: 'bold'}}>One or more checks failed</h1>
        <ul className='pl-4 my-0'>
            {checks}
        </ul>
    </section>;
}

interface NewVersionCardProps {
    prInfo: github.PrInfo;
    prCommits: github.GithubCommit[];
    prCheckResult: prcheck.PrCheckResult;
}

function NewVersionCard(props: NewVersionCardProps): JSX.Element {
    const heading = 'Submit a new iteration';
    if (props.prInfo.state === 'closed' || props.prInfo.merged) {
        return <Card heading={heading}>
            <Alert color='info'>
                <strong>PR closed.</strong> No more iterations can be submitted.
            </Alert>
        </Card>;
    } else {
        return <Card heading={heading}>
            <h2 style={{fontSize: '1.2rem'}}>PR Description</h2>
            <BodyBlock body={props.prInfo.body} scrollable />
            <h2 style={{fontSize: '1.2rem'}}>Commits ({props.prInfo.commits})</h2>
            {props.prCommits.length === props.prInfo.commits ?
                <CommitList prCommits={props.prCommits} /> :
                <Alert color='warning'>
                    <strong>Too many commits.</strong> The commit list cannot be displayed.
                </Alert>
            }
            <hr />
            <PrCheckErrorsView prCheckResult={props.prCheckResult} />
            <form action='' method='post'>
                <input className='d-block mx-auto btn btn-primary' type='submit' value='Submit new iteration'
                    disabled={!isEmpty(props.prCheckResult)} />
            </form>
        </Card>;
    }
}

export interface PrGetProps extends PrTemplateProps {
    prCommits: github.GithubCommit[];
    prCheckResult: prcheck.PrCheckResult;
}

export class PrGet extends React.Component<PrGetProps, {}> {
    render(): JSX.Element {
        const { children, prCommits, prCheckResult, ...other } = this.props;
        return <PrTemplate {...other}>
            <NewVersionCard prInfo={this.props.prInfo} prCommits={prCommits} prCheckResult={prCheckResult} />
        </PrTemplate>;
    }
}

export default PrGet;

if (require.main && String(require.main.i) === String(module.id)) {
    renderClient(PrGet);
}
