/**
 * @module
 * Job monitor entry point
 */
import renderClient from '@webui/renderClient';
import {
    Template,
    TemplateProps,
} from '@webui/template';
import fetchPonyfill from 'fetch-ponyfill';
import React from 'react';
import {
    Alert,
} from 'reactstrap';
import {
    jobRoute,
} from '../routes';

const { fetch } = fetchPonyfill();

interface JobResolvedViewProps {}

function JobResolvedView(props: JobResolvedViewProps): JSX.Element {
    return <div>
        <h1 className='display-4 mt-4 text-center'>Operation succeeded</h1>
    </div>;
}

interface JobRejectedViewProps {
    jobMessage?: string;
    jobId: string;
}

function JobRejectedView(props: JobRejectedViewProps): JSX.Element {
    return <div>
        <h1 className='display-4 mt-4 text-center'>An error occurred</h1>
        <pre className='lead'>{props.jobMessage || ''}</pre>
        {typeof props.jobMessage === 'undefined' && <Alert color='info'>
            If this problem persists, please file an issue with our {' '}
            <a href='https://github.com/CanIHasReview/CanIHasReview/issues'>Issue Tracker</a>
            {' '} and provide us with your job ID <code>job-{props.jobId}</code>,
            as well as details on how you caused this error to occur.
        </Alert>}
    </div>;
}

interface JobRunningViewProps {}

interface JobRunningViewState {
    hideJavascriptWarning: boolean;
}

class JobRunningView extends React.Component<JobRunningViewProps, JobRunningViewState> {
    constructor(props?: JobRunningViewProps) {
        super(props);
        this.state = {
            hideJavascriptWarning: false,
        };
    }

    componentDidMount(): void {
        this.setState({
            hideJavascriptWarning: true,
        });
    }

    render(): JSX.Element {
        return <div>
            <h1 className='display-4 mt-4 text-center'>Please wait...</h1>
            <div className='sk-rotating-plane' />
            {!this.state.hideJavascriptWarning &&
                <Alert color='warning'>
                    <strong>Javascript disabled.</strong> Refresh the page for the latest status.
                </Alert>
            }
        </div>;
    }
}

export interface JobPageProps extends TemplateProps {
    jobName: string;
    jobState: JobState;
    jobMessage?: string;
}

interface JobPageState {
    jobState: JobState;
    jobMessage?: string;
}

const POLL_INTERVAL = 3 * 1000; // 3s
type JobState = 'running' | 'resolved' | 'rejected';
export type JsonJobStatus = [JobState, (string | null)];

export class JobPage extends React.Component<JobPageProps, JobPageState> {
    private timerId: any;
    private jobId: string;

    constructor(props?: JobPageProps) {
        super(props);
        this.timerId = undefined;
        this.state = {
            jobMessage: this.props.jobMessage,
            jobState: this.props.jobState,
        };
        const routeProps = jobRoute.matchPath(this.props.pathname, this.props.search);
        if (!routeProps) {
            throw new Error('could not parse jobRoute: should not happen');
        }
        this.jobId = routeProps.name;
    }

    componentDidMount(): void {
        if (this.state.jobState === 'running') {
            this.timerId = setTimeout(() => this.poll(), POLL_INTERVAL);
        }
    }

    componentWillUnmount(): void {
        clearTimeout(this.timerId);
        this.timerId = undefined;
    }

    render(): JSX.Element {
        const { children, jobState, jobMessage, jobName, ...other } = this.props;
        return <Template {...other}>
            <div className='container'>
                {this.state.jobState === 'running' ? <JobRunningView /> :
                this.state.jobState === 'resolved' ? <JobResolvedView /> :
                <JobRejectedView jobMessage={this.state.jobMessage} jobId={this.jobId} />}
            </div>
        </Template>;
    }

    private async poll(): Promise<void> {
        clearTimeout(this.timerId);
        this.timerId = undefined;
        let continueTimer = true;
        try {
            const path = jobRoute.toPath({ name: this.props.jobName }, this.props.mountPath);
            const resp = await fetch(`${path}?json`);
            if (!resp.ok) {
                return;
            }
            const json: JsonJobStatus = await resp.json();
            if (json[0] !== 'running') {
                continueTimer = false;
            }
            this.setState({
                jobMessage: json[1] || undefined,
                jobState: json[0],
            });
        } finally {
            if (continueTimer) {
                this.timerId = setTimeout(() => this.poll(), POLL_INTERVAL);
            }
        }
    }
}

export default JobPage;

if (require.main && String(require.main.i) === String(module.id)) {
    renderClient(JobPage);
}
