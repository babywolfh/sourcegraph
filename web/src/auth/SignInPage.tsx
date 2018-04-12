import KeyIcon from '@sourcegraph/icons/lib/Key'
import Loader from '@sourcegraph/icons/lib/Loader'
import * as H from 'history'
import upperFirst from 'lodash/upperFirst'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { Redirect } from 'react-router-dom'
import { Form } from '../components/Form'
import { HeroPage } from '../components/HeroPage'
import { PageTitle } from '../components/PageTitle'
import { eventLogger } from '../tracking/eventLogger'
import { userForgotPassword } from '../util/features'
import { getReturnTo, PasswordInput } from './SignInSignUpCommon'

interface SignInFormProps {
    location: H.Location
    history: H.History
}

interface SignInFormState {
    email: string
    password: string
    errorDescription: string
    loading: boolean
}

class SignInForm extends React.Component<SignInFormProps, SignInFormState> {
    constructor(props: SignInFormProps) {
        super(props)
        this.state = {
            email: '',
            password: '',
            errorDescription: '',
            loading: false,
        }
    }

    public render(): JSX.Element | null {
        return (
            <Form className="signin-signup-form signin-form" onSubmit={this.handleSubmit}>
                {window.context.site['auth.allowSignup'] && (
                    <Link className="signin-signup-form__mode" to={`/sign-up${this.props.location.search}`}>
                        Don't have an account? Sign up.
                    </Link>
                )}
                {this.state.errorDescription !== '' && (
                    <div className="alert alert-danger my-2">Error: {upperFirst(this.state.errorDescription)}</div>
                )}
                <div className="form-group">
                    <input
                        className={`form-control signin-signup-form__input`}
                        type="text"
                        placeholder="Username or email"
                        onChange={this.onEmailFieldChange}
                        required={true}
                        value={this.state.email}
                        disabled={this.state.loading}
                        autoFocus={true}
                    />
                </div>
                <div className="form-group">
                    <PasswordInput
                        className="signin-signup-form__input"
                        onChange={this.onPasswordFieldChange}
                        value={this.state.password}
                        required={true}
                        disabled={this.state.loading}
                    />
                    {userForgotPassword && (
                        <small className="form-text">
                            <Link to="/password-reset">Forgot password?</Link>
                        </small>
                    )}
                </div>
                <div className="form-group">
                    <button className="btn btn-primary btn-block" type="submit" disabled={this.state.loading}>
                        Sign in
                    </button>
                </div>
                {this.state.loading && (
                    <div className="signin-signup-form__loader">
                        <Loader className="icon-inline" />
                    </div>
                )}
            </Form>
        )
    }

    private onEmailFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ email: e.target.value })
    }

    private onPasswordFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ password: e.target.value })
    }

    private handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (this.state.loading) {
            return
        }

        this.setState({ loading: true })
        eventLogger.log('InitiateSignIn')
        fetch('/-/sign-in', {
            credentials: 'same-origin',
            method: 'POST',
            headers: {
                ...window.context.xhrHeaders,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: this.state.email,
                password: this.state.password,
            }),
        })
            .then(resp => {
                if (resp.status === 200) {
                    const returnTo = getReturnTo(this.props.location)
                    window.location.replace(returnTo)
                } else if (resp.status === 401) {
                    throw new Error('User or password was incorrect')
                } else {
                    throw new Error('Unknown Error')
                }
            })
            .catch(err => {
                console.error('auth error: ', err)
                this.setState({ loading: false, errorDescription: (err && err.message) || 'Unknown Error' })
            })
    }
}

interface SignInPageProps {
    location: H.Location
    history: H.History
    user: GQL.IUser | null
}

export class SignInPage extends React.Component<SignInPageProps> {
    public componentDidMount(): void {
        eventLogger.logViewEvent('SignIn', {}, false)
    }

    public render(): JSX.Element | null {
        if (this.props.user) {
            const returnTo = getReturnTo(this.props.location)
            return <Redirect to={returnTo} />
        }

        return (
            <div className="signin-signup-page sign-in-page">
                <PageTitle title="Sign in" />
                <HeroPage icon={KeyIcon} title="Sign into Sourcegraph" cta={<SignInForm {...this.props} />} />
            </div>
        )
    }
}
