import React, { useEffect, useRef, useState } from 'react';

// Import Voice Orb modules (adjust paths as needed)
// import { VoiceOrbAdvanced } from '../voice-orb.js';

/**
 * VoiceOrbReact Component
 * React wrapper for the Voice Orb functionality
 */
const VoiceOrbReact = ({
  animationSource = '/1750876529446.json',
  enableVAD = true,
  debug = false,
  width = 300,
  height = 300,
  className = '',
  style = {},
  vadOptions = {},
  orbOptions = {},
  onReady = () => {},
  onVoiceStart = () => {},
  onVoiceEnd = () => {},
  onVoiceLevel = () => {},
  onPlay = () => {},
  onPause = () => {},
  onError = () => {}
}) => {
  const orbRef = useRef(null);
  const playerRef = useRef(null);
  const [orbState, setOrbState] = useState({
    isInitialized: false,
    isConnected: false,
    isVADActive: false,
    isPlaying: false,
    currentSpeed: 1,
    voiceLevel: 0,
    error: null
  });

  useEffect(() => {
    initializeOrb();
    return cleanup;
  }, []);

  const initializeOrb = async () => {
    try {
      // Create orb instance
      orbRef.current = new VoiceOrbAdvanced({
        debug,
        enableVAD,
        orb: orbOptions,
        vad: {
          threshold: 0.01,
          sensitivity: 0.6,
          smoothing: 0.85,
          ...vadOptions
        }
      });

      // Setup event listeners
      setupEventListeners();

      // Initialize with the player element
      const success = await orbRef.current.init(playerRef.current, animationSource);

      if (success) {
        setOrbState(prev => ({ ...prev, isInitialized: true }));
        onReady(orbRef.current);
      } else {
        throw new Error('Failed to initialize voice orb');
      }
    } catch (error) {
      console.error('VoiceOrbReact initialization error:', error);
      setOrbState(prev => ({ ...prev, error: error.message }));
      onError(error);
    }
  };

  const setupEventListeners = () => {
    if (!orbRef.current) return;

    // Orb events
    orbRef.current.orb.on('play', () => {
      setOrbState(prev => ({ ...prev, isPlaying: true }));
      onPlay();
    });

    orbRef.current.orb.on('pause', () => {
      setOrbState(prev => ({ ...prev, isPlaying: false }));
      onPause();
    });

    orbRef.current.orb.on('speedChange', (speed) => {
      setOrbState(prev => ({ ...prev, currentSpeed: speed }));
    });

    // VAD events
    if (orbRef.current.vad) {
      orbRef.current.vad.on('voiceStart', () => {
        onVoiceStart();
      });

      orbRef.current.vad.on('voiceEnd', () => {
        onVoiceEnd();
      });

      orbRef.current.vad.on('voiceLevel', (data) => {
        setOrbState(prev => ({ ...prev, voiceLevel: data.smoothed }));
        onVoiceLevel(data);
      });
    }
  };

  const cleanup = () => {
    if (orbRef.current) {
      orbRef.current.destroy();
      orbRef.current = null;
    }
  };

  // Component methods (exposed via ref or props)
  const connectMicrophone = async (options = {}) => {
    if (!orbRef.current) return false;

    try {
      const success = await orbRef.current.connectMicrophone(options);
      if (success) {
        setOrbState(prev => ({
          ...prev,
          isConnected: true,
          isVADActive: true
        }));
      }
      return success;
    } catch (error) {
      onError(error);
      return false;
    }
  };

  const disconnectMicrophone = () => {
    if (!orbRef.current) return;

    orbRef.current.disconnectMicrophone();
    setOrbState(prev => ({
      ...prev,
      isConnected: false,
      isVADActive: false
    }));
  };

  const toggleVAD = () => {
    if (!orbRef.current || !orbState.isConnected) return false;

    const newState = !orbState.isVADActive;
    const success = orbRef.current.setVAD(newState);

    if (success) {
      setOrbState(prev => ({ ...prev, isVADActive: newState }));
    }

    return success;
  };

  const play = () => orbRef.current?.play();
  const pause = () => orbRef.current?.pause();
  const stop = () => orbRef.current?.stop();
  const setSpeed = (speed) => orbRef.current?.setSpeed(speed);
  const setVoiceLevel = (level) => orbRef.current?.setVoiceLevel(level);

  // Expose methods via useImperativeHandle if needed
  React.useImperativeHandle(playerRef, () => ({
    connectMicrophone,
    disconnectMicrophone,
    toggleVAD,
    play,
    pause,
    stop,
    setSpeed,
    setVoiceLevel,
    getState: () => orbRef.current?.getState(),
    orb: orbRef.current
  }));

  if (orbState.error) {
    return (
      <div className={`voice-orb-error ${className}`} style={style}>
        <p>Error: {orbState.error}</p>
      </div>
    );
  }

  return (
    <div className={`voice-orb-container ${className}`} style={style}>
      <lottie-player
        ref={playerRef}
        src={animationSource}
        background="transparent"
        speed="1"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          opacity: 0.9,
          ...style
        }}
        loop
      />

      {/* Optional status indicator */}
      {orbState.isVADActive && (
        <div className="voice-activity-indicator">
          <div
            className="voice-level-bar"
            style={{
              width: `${Math.min(orbState.voiceLevel * 200, 100)}%`,
              height: '4px',
              background: 'linear-gradient(90deg, #00ff00, #ffff00, #ff0000)',
              transition: 'width 0.1s'
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Custom Hook for Voice Orb
 * Provides a hook-based API for using Voice Orb in React
 */
export const useVoiceOrb = (options = {}) => {
  const orbRef = useRef(null);
  const [state, setState] = useState({
    isInitialized: false,
    isConnected: false,
    isVADActive: false,
    isPlaying: false,
    error: null
  });

  const initialize = async (playerElement, animationSource) => {
    try {
      orbRef.current = new VoiceOrbAdvanced(options);

      const success = await orbRef.current.init(playerElement, animationSource);
      setState(prev => ({ ...prev, isInitialized: success }));

      return success;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  };

  const connectMicrophone = async (vadOptions = {}) => {
    if (!orbRef.current) return false;

    try {
      const success = await orbRef.current.connectMicrophone(vadOptions);
      setState(prev => ({
        ...prev,
        isConnected: success,
        isVADActive: success
      }));
      return success;
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  };

  const disconnect = () => {
    if (orbRef.current) {
      orbRef.current.disconnectMicrophone();
      setState(prev => ({
        ...prev,
        isConnected: false,
        isVADActive: false
      }));
    }
  };

  const destroy = () => {
    if (orbRef.current) {
      orbRef.current.destroy();
      orbRef.current = null;
      setState({
        isInitialized: false,
        isConnected: false,
        isVADActive: false,
        isPlaying: false,
        error: null
      });
    }
  };

  useEffect(() => {
    return destroy; // Cleanup on unmount
  }, []);

  return {
    orb: orbRef.current,
    state,
    initialize,
    connectMicrophone,
    disconnect,
    destroy,
    play: () => orbRef.current?.play(),
    pause: () => orbRef.current?.pause(),
    stop: () => orbRef.current?.stop(),
    setSpeed: (speed) => orbRef.current?.setSpeed(speed),
    setVoiceLevel: (level) => orbRef.current?.setVoiceLevel(level)
  };
};

/**
 * Example usage component
 */
export const VoiceOrbExample = () => {
  const [micConnected, setMicConnected] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const orbRef = useRef();

  const handleConnectMic = async () => {
    if (orbRef.current) {
      const success = await orbRef.current.connectMicrophone();
      setMicConnected(success);
    }
  };

  const handleDisconnectMic = () => {
    if (orbRef.current) {
      orbRef.current.disconnectMicrophone();
      setMicConnected(false);
    }
  };

  return (
    <div className="voice-orb-demo">
      <h2>Voice Orb React Integration</h2>

      <VoiceOrbReact
        ref={orbRef}
        width={400}
        height={400}
        enableVAD={true}
        debug={true}
        onVoiceStart={() => setVoiceActive(true)}
        onVoiceEnd={() => setVoiceActive(false)}
        onError={(error) => console.error('Voice Orb Error:', error)}
        className="my-voice-orb"
        style={{ margin: '20px auto' }}
      />

      <div className="controls">
        <button
          onClick={handleConnectMic}
          disabled={micConnected}
          className="btn-primary"
        >
          {micConnected ? '🎤 Connected' : '🎤 Connect Microphone'}
        </button>

        <button
          onClick={handleDisconnectMic}
          disabled={!micConnected}
          className="btn-secondary"
        >
          ❌ Disconnect
        </button>
      </div>

      <div className="status">
        <p>Status: {voiceActive ? 'Voice Active' : 'Listening'}</p>
        <p>Microphone: {micConnected ? 'Connected' : 'Disconnected'}</p>
      </div>
    </div>
  );
};

// CSS for the component (include in your stylesheet)
const styles = `
.voice-orb-container {
  position: relative;
  display: inline-block;
}

.voice-activity-indicator {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.voice-orb-error {
  padding: 20px;
  background: #ffe6e6;
  border: 1px solid #ff9999;
  border-radius: 5px;
  color: #cc0000;
}

.voice-orb-demo .controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 20px 0;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status {
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 5px;
}
`;

export default VoiceOrbReact;
