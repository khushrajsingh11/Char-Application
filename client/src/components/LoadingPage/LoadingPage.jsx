import React, { useState, useEffect } from 'react';
import './LoadingPage.css';

const Loading = () => {
  const [loadingText, setLoadingText] = useState('Loading');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    'Initializing connection...',
    'Loading your conversations...',
    'Syncing messages...',
    'Almost ready...'
  ];

  useEffect(() => {
    const textInterval = setInterval(() => {
      setLoadingText(prev => prev === 'Loading...' ? 'Loading' : prev + '.');
    }, 500);

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 100 ? 100 : prev + Math.random() * 15);
    }, 300);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => prev >= loadingSteps.length - 1 ? prev : prev + 1);
    }, 2000);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [loadingSteps.length]);

  const renderFloatingElements = () => (
    <>
      <div className="floating-circle floating-circle-1" />
      <div className="floating-circle floating-circle-2" />
      <div className="floating-circle floating-circle-3" />
    </>
  );

  const renderLogo = () => (
    <div className="logo-container">
      <div className="logo-icon">💬</div>
      <span className="logo-text">ChatApp</span>
    </div>
  );

  const renderSpinner = () => (
    <div className="spinner-container">
      <div className="spinner-outer" />
      <div className="spinner-inner" />
    </div>
  );

  const renderProgressBar = () => {
    const clampedProgress = Math.min(progress, 100);
    
    return (
      <>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <p className="progress-text">
          {Math.floor(clampedProgress)}% complete
        </p>
      </>
    );
  };

  const renderAnimatedDots = () => (
    <div className="dots-container">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );

  return (
    <div className="loading-container">
      {renderFloatingElements()}
      
      <div className="main-container">
        {renderLogo()}
        {renderSpinner()}
        
        <h2 className="loading-text">{loadingText}</h2>
        <p className="step-text">{loadingSteps[currentStep]}</p>
        
        {renderProgressBar()}
        {renderAnimatedDots()}
      </div>
    </div>
  );
};

export default Loading;
