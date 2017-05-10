/**
 * @module
 * Error page entry point.
 */
import React from 'react';
import {
    Alert,
    Container,
} from 'reactstrap';
import renderClient from '../renderClient';
import { Template, TemplateProps } from '../template';

export interface ErrorPageProps extends TemplateProps {
    title: string;
    message: string;
    reqId?: string;
}

export class ErrorPage extends React.Component<ErrorPageProps, {}> {
    render(): JSX.Element {
        const { children, title, message, reqId, ...others } = this.props;
        return <Template {...others}>
            <Container className='mt-5'>
                <h1 className='display-4'>{title}</h1>
                <pre className='lead'>{message}</pre>
                {reqId && <Alert color='danger'>
                    <strong>Uh oh!</strong> This seems to be a bug.
                    Please file an issue with our {' '}
                    <a href='https://github.com/CanIHasReview/CanIHasReview/issues'>Issue Tracker</a>
                    {' '} and provide us with your request ID <code>{reqId}</code>,
                    as well as details on how you caused this error to occur.
                </Alert>}
            </Container>
        </Template>;
    }
}

export default ErrorPage;

if (require.main && String(require.main.i) === String(module.id)) {
    renderClient(ErrorPage);
}
