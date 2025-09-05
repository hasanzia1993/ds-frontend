import React, { useState, useEffect } from 'react';
import { Button, Typography } from 'antd';
import { PlusOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { isMobile, isTablet, isIOS, isAndroid } from 'react-device-detect';

const { Text } = Typography;

const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode (PWA)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true || // iOS Safari
        document.referrer.includes('android-app://'); // Android

      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Listen for the beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if we should show the banner
      const isDeviceSupported = isMobile || isTablet;
      const hasNotDismissed = !localStorage.getItem('pwa-banner-dismissed');
      
      if (isDeviceSupported && !isStandalone && hasNotDismissed) {
        setShowBanner(true);
      }
    };

    // Check if banner should be shown on iOS (Safari doesn't support beforeinstallprompt)
    const checkIOSBanner = () => {
      const isDeviceSupported = isMobile || isTablet;
      const hasNotDismissed = !localStorage.getItem('pwa-banner-dismissed');
      const isIOSBrowser = isIOS && !isStandalone;
      
      if (isIOSBrowser && isDeviceSupported && hasNotDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // For iOS, check after a short delay to ensure all checks are complete
    setTimeout(checkIOSBanner, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowBanner(false);
    } else if (isIOS) {
      // iOS installation instructions
      alert(
        'To install this app on your iOS device:\n\n' +
        '1. Tap the Share button in Safari\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" to confirm'
      );
    } else {
      // Fallback for other browsers
      alert(
        'To install this app:\n\n' +
        'Use your browser\'s menu to "Add to Home Screen" or "Install App"'
      );
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const getInstallText = () => {
    if (isIOS) {
      return 'Add to Home Screen';
    } else if (isAndroid) {
      return 'Install App';
    } else {
      return 'Install App';
    }
  };

  const getInstructions = () => {
    if (isIOS) {
      return 'Install this app for a better experience';
    } else {
      return 'Install this app for faster access and offline use';
    }
  };

  if (!showBanner || isStandalone) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#4a90e2',
        color: 'white',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <DownloadOutlined 
          style={{ 
            fontSize: '16px', 
            marginRight: '8px',
            color: 'white'
          }} 
        />
        <div>
          <Text 
            style={{ 
              color: 'white', 
              fontSize: '14px', 
              fontWeight: '500',
              display: 'block',
              lineHeight: '1.2'
            }}
          >
            {getInstructions()}
          </Text>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          type="text"
          size="small"
          onClick={handleInstall}
          style={{
            color: 'white',
            border: '1px solid white',
            borderRadius: '4px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '500',
            height: 'auto',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          {getInstallText()}
        </Button>
        
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleDismiss}
          style={{
            color: 'white',
            border: 'none',
            padding: '4px',
            fontSize: '12px',
            height: 'auto',
            backgroundColor: 'transparent',
            minWidth: 'auto',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        />
      </div>
      
      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default PWAInstallBanner;
