/**
 * @module
 * Common Template component.
 */
import {
    MiniPublicUserInfo,
} from '@lib/github';
import React from 'react';
import {
    Collapse,
    Container,
    Nav,
    NavbarBrand,
    NavbarToggler,
    NavItem,
    NavLink,
} from 'reactstrap';
import {
    getAuthLoginPath,
} from './paths';

export interface TopBarProps {
    ghUserInfo: MiniPublicUserInfo | null;
    mountPath: string;
    pathname: string;
    search: string;
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
        const { ghUserInfo, pathname, search, mountPath } = this.props;
        const authLoginPath = getAuthLoginPath({ pathname, search, mountPath });
        const authStatus = ghUserInfo ? [
            <NavItem className='navbar-text py-2' key='authUser'>
                <img src={ghUserInfo.avatar_url} className='align-middle rounded' style={{height: '1.5em'}} />
                <span className='mx-1'>{ghUserInfo.login}</span>
            </NavItem>,
            <NavItem key='authLogout'><NavLink href='/auth/logout' className='py-2'>Logout</NavLink></NavItem>,
        ] : [
            <NavItem key='authLogin'><NavLink href={authLoginPath}>Login with GitHub</NavLink></NavItem>,
        ];
        return <nav className='navbar navbar-expand-lg navbar-dark'
                style={{backgroundColor: '#2d3e2f'}}>
            <Container>
                <NavbarBrand href={this.props.mountPath || '/'}>CanIHasReview</NavbarBrand>
                <NavbarToggler right onClick={this._toggle} />
                <Collapse isOpen={this.state.isOpen} navbar>
                    <Nav className='mr-auto' navbar />
                    <Nav navbar>{authStatus}</Nav>
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
