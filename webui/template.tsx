/**
 * @module
 * Common Template component.
 */
import React from 'react';
import {
    Collapse,
    Container,
    Nav,
    NavbarBrand,
    NavbarToggler,
} from 'reactstrap';

export interface TopBarProps {
    mountPath: string;
}

interface TopBarState {
    isOpen: boolean;
}

export class TopBar extends React.Component<TopBarProps, TopBarState> {
    private _toggle: () => void;

    constructor(props: TopBarProps) {
        super(props);
        this._toggle = this.toggle.bind(this);
        this.state = {
            isOpen: false,
        };
    }

    toggle(): void {
        this.setState({
            isOpen: !this.state.isOpen,
        });
    }

    render(): JSX.Element {
        return <nav className='navbar navbar-expand-lg navbar-dark'
                style={{backgroundColor: '#2d3e2f'}}>
            <Container>
                <NavbarBrand href={this.props.mountPath || '/'}>CanIHasReview</NavbarBrand>
                <NavbarToggler right onClick={this._toggle} />
                <Collapse isOpen={this.state.isOpen} navbar>
                    <Nav className='mr-auto' navbar />
                </Collapse>
            </Container>
        </nav>;
    }
}

export interface TemplateProps extends TopBarProps {
    children?: React.ReactNode;
}

export function Template(props: TemplateProps): JSX.Element {
    const { children, ...other } = props;
    return <div>
        <TopBar {...other} />
        {props.children}
    </div>;
}

export default Template;
