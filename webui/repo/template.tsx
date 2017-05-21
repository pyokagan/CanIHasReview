import React from 'react';
import {
    Container,
} from 'reactstrap';
import {
    RepoInfo,
} from '../../lib/github';
import { Template, TemplateProps } from '../template';

export interface RepoTemplateProps extends TemplateProps {
    repoInfo: RepoInfo;
}

export class RepoTemplate extends React.Component<RepoTemplateProps, {}> {
    render(): JSX.Element {
        const { children, repoInfo, ...other } = this.props;
        return <Template {...other}>
            <div className='repohead mb-4'>
                <Container className='py-4'>
                    <h1>{repoInfo.full_name}</h1>
                </Container>
            </div>
            {children}
        </Template>;
    }
}
