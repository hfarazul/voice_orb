/**
 * Voice Orb - Complete Module
 * Combines VoiceOrbCore and VoiceActivityDetector for easy integration
 *
 * @version 2.0.0
 * @author Voice Graphics
 * @license MIT
 */

// Include required modules (can be loaded separately or bundled)
if (typeof VoiceOrbCore === 'undefined') {
    console.error('VoiceOrbCore not found. Please include voice-orb-core.js');
}
if (typeof VoiceActivityDetector === 'undefined') {
    console.error('VoiceActivityDetector not found. Please include voice-orb-vad.js');
}

/**
 * High-level Voice Orb wrapper class
 */
class VoiceOrbAdvanced {
    constructor(options = {}) {
        // Initialize core orb
        this.orb = new VoiceOrbCore({
            debug: options.debug || false,
            ...options.orb
        });

        // Initialize VAD (optional)
        this.vad = options.enableVAD !== false ? new VoiceActivityDetector({
            debug: options.debug || false,
            ...options.vad
        }) : null;

        // Connection state
        this.isConnected = false;
        this.isVADActive = false;

        // Setup VAD event handlers if available
        if (this.vad) {
            this.setupVADHandlers();
        }

        this.log('VoiceOrb initialized with VAD:', !!this.vad);
    }

    /**
     * Initialize the voice orb
     * @param {string|HTMLElement} playerElement - Player element or ID
     * @param {string} animationSource - Path to Lottie JSON file
     * @returns {Promise<boolean>} Success status
     */
    async init(playerElement, animationSource = null) {
        return await this.orb.init(playerElement, animationSource);
    }

    /**
     * Setup VAD event handlers
     */
    setupVADHandlers() {
        if (!this.vad) return;

        this.vad.on('voiceStart', () => {
            this.orb.play();
            this.log('VAD: Voice detected - starting animation');
        });

        this.vad.on('voiceEnd', () => {
            this.orb.pause();
            this.log('VAD: Voice ended - pausing animation');
        });

        this.vad.on('voiceLevel', (data) => {
            // Update orb based on voice level
            const level = Math.max(0.1, Math.min(3, data.smoothed * 3));
            this.orb.setVoiceLevel(level);
        });
    }

    /**
     * Connect microphone and enable VAD
     * @param {Object} vadOptions - VAD configuration options
     * @returns {Promise<boolean>} Success status
     */
    async connectMicrophone(vadOptions = {}) {
        if (!this.vad) {
            this.log('VAD not available - creating new instance');
            this.vad = new VoiceActivityDetector({
                debug: this.orb.config.debug,
                ...vadOptions
            });
            this.setupVADHandlers();
        }

        // Update VAD configuration
        if (Object.keys(vadOptions).length > 0) {
            this.vad.updateConfig(vadOptions);
        }

        // Connect microphone
        const connected = await this.vad.connect();
        if (connected) {
            this.isConnected = true;
            const started = this.vad.start();
            if (started) {
                this.isVADActive = true;
                this.log('Microphone connected and VAD active');
                return true;
            }
        }

        return false;
    }

    /**
     * Disconnect microphone and disable VAD
     */
    disconnectMicrophone() {
        if (this.vad) {
            this.vad.disconnect();
            this.isConnected = false;
            this.isVADActive = false;
            this.log('Microphone disconnected');
        }
    }

    /**
     * Enable/disable VAD without reconnecting microphone
     * @param {boolean} enabled - Whether to enable VAD
     * @returns {boolean} Success status
     */
    setVAD(enabled) {
        if (!this.vad || !this.isConnected) {
            this.log('Cannot set VAD: not connected');
            return false;
        }

        if (enabled && !this.isVADActive) {
            this.isVADActive = this.vad.start();
            this.log('VAD enabled');
        } else if (!enabled && this.isVADActive) {
            this.vad.stop();
            this.isVADActive = false;
            this.log('VAD disabled');
        }

        return this.isVADActive === enabled;
    }

    // Forward core orb methods with VAD protection
    play() {
        if (this.isVADActive) {
            this.log('VAD is active - use microphone to control playback');
            return false;
        }
        return this.orb.play();
    }

    pause() {
        if (this.isVADActive) {
            this.log('VAD is active - use microphone to control playback');
            return false;
        }
        return this.orb.pause();
    }

    stop() {
        if (this.isVADActive) {
            this.log('VAD is active - use microphone to control playback');
            return false;
        }
        return this.orb.stop();
    }

    // Direct pass-through methods
    setSpeed(speed) { return this.orb.setSpeed(speed); }
    setLoop(loop) { return this.orb.setLoop(loop); }
    setOpacity(opacity) { return this.orb.setOpacity(opacity); }

    setVoiceLevel(level) {
        if (this.isVADActive) {
            // Temporarily disable VAD for manual control
            this.vad.stop();
            setTimeout(() => {
                if (this.isConnected) this.vad.start();
            }, 2000);
        }
        return this.orb.setVoiceLevel(level);
    }

    // State and configuration getters
    getState() {
        return {
            orb: this.orb.getState(),
            vad: this.vad ? this.vad.getState() : null,
            isConnected: this.isConnected,
            isVADActive: this.isVADActive
        };
    }

    getConfig() {
        return {
            orb: this.orb.getConfig(),
            vad: this.vad ? this.vad.getConfig() : null
        };
    }

    isReady() { return this.orb.isReady(); }

    // Event handling
    on(event, callback) {
        this.orb.on(event, callback);
        if (this.vad) this.vad.on(event, callback);
    }

    off(event, callback) {
        this.orb.off(event, callback);
        if (this.vad) this.vad.off(event, callback);
    }

    // Cleanup
    destroy() {
        this.orb.destroy();
        if (this.vad) {
            this.vad.destroy();
        }
        this.log('VoiceOrb destroyed');
    }

    // Utility methods
    updateConfig(config) {
        if (config.orb) this.orb.updateConfig(config.orb);
        if (config.vad && this.vad) this.vad.updateConfig(config.vad);
    }

    log(...args) {
        if (this.orb.config.debug) {
            console.log('[VoiceOrb]', ...args);
        }
    }

    // Static utility methods
    static isVADSupported() {
        return typeof VoiceActivityDetector !== 'undefined' && VoiceActivityDetector.isSupported();
    }
}

/**
 * Legacy VoiceOrb API for backward compatibility
 * This maintains the original function-based API
 */
const VoiceOrb = (function() {
    let instance = null;

    // Internal state tracking
    let isLooping = true;
    let currentSpeed = 1;
    let isPlaying = false;
    let vadEnabled = false;
    let microphoneData = null;

    // DOM elements cache
    let elements = {
        animationState: null,
        currentSpeed: null,
        loopStatus: null,
        voiceLevelDisplay: null,
        loopBtn: null,
        speedBtn: null
    };

    function updateStatus() {
        if (elements.currentSpeed) elements.currentSpeed.textContent = currentSpeed.toFixed(1) + 'x';
        if (elements.loopStatus) elements.loopStatus.textContent = isLooping ? 'Enabled' : 'Disabled';
        if (elements.animationState) {
            let stateText = isPlaying ? 'Playing' : 'Paused';
            if (vadEnabled) {
                const state = instance?.getState();
                stateText += state?.vad?.isVoiceDetected ? ' (Voice Active)' : ' (Voice Inactive)';
            }
            elements.animationState.textContent = stateText;
        }
    }

    function bindDOMElements() {
        elements.animationState = document.getElementById('animationState');
        elements.currentSpeed = document.getElementById('currentSpeed');
        elements.loopStatus = document.getElementById('loopStatus');
        elements.voiceLevelDisplay = document.getElementById('voiceLevelDisplay');
        elements.loopBtn = document.getElementById('loopBtn');
        elements.speedBtn = document.getElementById('speedBtn');
    }

    return {
        /**
         * Initialize the Voice Orb
         * @param {string} playerId - ID of the lottie-player element
         */
        init: function(playerId) {
            if (!instance) {
                instance = new VoiceOrbAdvanced({
                    debug: false,
                    enableVAD: true
                });

                // Setup event listeners for status updates
                instance.orb.on('play', () => {
                    isPlaying = true;
                    updateStatus();
                });

                instance.orb.on('pause', () => {
                    isPlaying = false;
                    updateStatus();
                });

                instance.orb.on('speedChange', (speed) => {
                    currentSpeed = speed;
                    updateStatus();
                });

                instance.orb.on('loopChange', (loop) => {
                    isLooping = loop;
                    updateStatus();
                });
            }

            bindDOMElements();
            return instance.init(playerId);
        },

        // Basic controls
        play: () => {
            if (instance) {
                const result = instance.play();
                updateStatus();
                return result;
            }
        },

        pause: () => {
            if (instance) {
                const result = instance.pause();
                updateStatus();
                return result;
            }
        },

        stop: () => {
            if (instance) {
                const result = instance.stop();
                updateStatus();
                return result;
            }
        },

        reset: () => {
            if (instance) {
                instance.stop();
                setTimeout(() => {
                    if (!vadEnabled) {
                        instance.play();
                    }
                    updateStatus();
                }, 100);
            }
        },

        toggleLoop: () => {
            if (instance) {
                isLooping = !isLooping;
                instance.setLoop(isLooping);

                if (elements.loopBtn) {
                    if (isLooping) {
                        elements.loopBtn.textContent = '🔄 Loop: ON';
                        elements.loopBtn.classList.remove('active');
                    } else {
                        elements.loopBtn.textContent = '➡️ Loop: OFF';
                        elements.loopBtn.classList.add('active');
                    }
                }
                updateStatus();
            }
        },

        changeSpeed: () => {
            if (instance) {
                const speeds = [0.5, 1, 1.5, 2, 3];
                const currentIndex = speeds.indexOf(currentSpeed);
                const nextIndex = (currentIndex + 1) % speeds.length;
                currentSpeed = speeds[nextIndex];

                instance.setSpeed(currentSpeed);
                if (elements.speedBtn) {
                    elements.speedBtn.textContent = `⚡ Speed: ${currentSpeed}x`;
                }
                updateStatus();
            }
        },

        adjustVoiceLevel: (level) => {
            if (instance) {
                const result = instance.setVoiceLevel(parseFloat(level));
                if (elements.voiceLevelDisplay) {
                    elements.voiceLevelDisplay.textContent = Math.round(level * 100) + '%';
                }
                updateStatus();
                return result;
            }
        },

        // VAD methods
        setVAD: (enabled, settings = {}) => {
            vadEnabled = enabled;
            if (instance) {
                return instance.setVAD(enabled);
            }
        },

        connectMicrophone: async (options = {}) => {
            if (instance) {
                const result = await instance.connectMicrophone({
                    threshold: 0.01,
                    minDuration: 150,
                    maxSilence: 800,
                    sensitivity: 0.6,
                    smoothing: 0.85,
                    ...options
                });

                if (result) {
                    microphoneData = instance.vad;
                    vadEnabled = true;
                }

                updateStatus();
                return result;
            }
        },

        disconnectMicrophone: () => {
            if (instance) {
                instance.disconnectMicrophone();
                microphoneData = null;
                vadEnabled = false;
                updateStatus();
            }
        },

        // Getters
        getState: () => instance?.getState(),
        getVADInfo: () => {
            if (!instance || !vadEnabled) return null;
            const state = instance.getState();
            return {
                enabled: vadEnabled,
                settings: state.vad,
                state: state.vad
            };
        },

        // Cleanup
        destroy: () => {
            if (instance) {
                instance.destroy();
                instance = null;
            }
        }
    };
})();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoiceOrb, VoiceOrbAdvanced, VoiceOrbCore, VoiceActivityDetector };
}

if (typeof window !== 'undefined') {
    window.VoiceOrb = VoiceOrb;
    window.VoiceOrbAdvanced = VoiceOrbAdvanced;
}

// AMD support
if (typeof define === 'function' && define.amd) {
    define('VoiceOrb', [], function() {
        return { VoiceOrb, VoiceOrbAdvanced, VoiceOrbCore, VoiceActivityDetector };
    });
}
