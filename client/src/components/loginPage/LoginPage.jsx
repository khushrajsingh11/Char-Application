import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [currState, setCurrState] = useState('signup');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const { login } = useContext(AuthContext);

  const resetForm = () => {
    setIsDataSubmitted(false);
    setAgreeToTerms(false);
    setFullname('');
    setEmail('');
    setPassword('');
    setBio('');
  };

  const onSubmitHandler = (event) => {
    event.preventDefault();

    if (currState === 'signup' && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    if (currState === 'login') {
      login('login', { email, password });
    } else {
      login('signup', { fullname, email, password, bio });
    }
  };

  const toggleState = () => {
    setCurrState(currState === 'signup' ? 'login' : 'signup');
    resetForm();
  };

  const getButtonText = () => {
    if (currState === 'signup' && !isDataSubmitted) return 'Continue';
    if (currState === 'signup') return 'Create Account';
    return 'Login';
  };

  const renderCheckmark = () => (
    <svg
      className="checkmark-icon"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );

  const renderSignupFields = () => (
    <div className="space-y-5">
      <input
        type="text"
        placeholder="Full Name"
        value={fullname}
        onChange={(e) => setFullname(e.target.value)}
        className="input-base"
        required
      />
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-base"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-base"
        required
      />
      {isDataSubmitted && (
        <textarea
          placeholder="Tell us about yourself (optional)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="input-base textarea-base"
        />
      )}
    </div>
  );

  const renderLoginFields = () => (
    <div className="space-y-5">
      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-base"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-base"
        required
      />
    </div>
  );

  const renderTermsCheckbox = () => (
    <div className="checkbox-container">
      <div>
        <input
          type="checkbox"
          id="terms"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          className="checkbox-input"
          required
        />
        <label
          htmlFor="terms"
          className={`checkbox-label ${agreeToTerms ? 'checkbox-checked' : ''}`}
        >
          {agreeToTerms && renderCheckmark()}
        </label>
      </div>
      <span>Agree to the terms of use & privacy policy</span>
    </div>
  );

  const renderToggleSection = () => (
    <div className="bottom-text">
      <span>
        {currState === 'signup'
          ? "Already have an account? "
          : "Don't have an account? "}
      </span>
      <button type="button" onClick={toggleState} className="bottom-toggle-button">
        {currState === 'signup' ? 'Login here' : 'Sign up here'}
      </button>
    </div>
  );

  return (
    <div className="login-page-container">
      <div className="content-wrapper">
        <div className="branding-wrapper">
          <h1 className="branding-title">NexTalk</h1>
          <p className="branding-subtitle">
            Connect instantly with friends and family around the world
          </p>
        </div>

        <div className="auth-container">
          <form className="auth-form" onSubmit={onSubmitHandler}>
            <h2 className="auth-heading">
              {currState === 'signup' ? 'Sign Up' : 'Login'}
            </h2>

            <div className="space-y-6">
              {currState === 'signup' ? renderSignupFields() : renderLoginFields()}

              <button type="submit" className="button-primary">
                <div className="button-hover-bg"></div>
                <span>{getButtonText()}</span>
              </button>

              {currState === 'signup' && renderTermsCheckbox()}
            </div>

            {renderToggleSection()}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
