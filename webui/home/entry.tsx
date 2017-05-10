/**
 * @module
 * Home page entry point.
 */
import React from 'react';
import {
    Button,
    Container,
} from 'reactstrap';
import renderClient from '../renderClient';
import { Template, TemplateProps } from '../template';

export interface HomeProps extends TemplateProps {}

export class Home extends React.Component<HomeProps, {}> {
    render(): JSX.Element {
        const { children, ...other } = this.props;
        return <Template {...other}>
            <header className='jumbotron jumbotron-fluid'
                    style={{backgroundColor: 'transparent'}}>
                <Container className='text-center'>
                    <h1 className='display-3'>CanIHasReview</h1>
                    <p className='lead'>GitHub Pull Request versioning utility.</p>
                    <hr className='my-4' />
                    <Button href='https://github.com/CanIHasReview/CanIHasReview'
                            color='primary' outline>View on GitHub</Button>
                </Container>
            </header>
        </Template>;
    }
}

export default Home;

if (require.main && String(require.main.i) === String(module.id)) {
    renderClient(Home);
}
