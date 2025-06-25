/**
 * Voice Orb Core Module
 * Ultra-lightweight, framework-agnostic voice orb animation controller
 *
 * @version 1.0.0
 * @author Voice Graphics
 * @license MIT
 */

class VoiceOrbCore {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            // Animation settings
            defaultSpeed: 1,
            minSpeed: 0.1,
            maxSpeed: 3,
            autoLoop: true,

            // Visual settings
            minOpacity: 0.8,
            maxOpacity: 1.0,

            // Voice settings
            minVoiceLevel: 0.1,
            maxVoiceLevel: 3,

            // Callbacks
            onReady: null,
            onPlay: null,
            onPause: null,
            onStop: null,
            onError: null,
            onVoiceChange: null,

            // Debug
            debug: false,

            ...options
        };

        // State
        this.state = {
            isInitialized: false,
            isPlaying: false,
            isLooping: true,
            currentSpeed: this.config.defaultSpeed,
            voiceLevel: 1,
            opacity: 1
        };

        // Player reference
        this.player = null;
        this.playerId = null;

        // Event listeners
        this.eventListeners = new Map();

        this.log('VoiceOrbCore initialized', this.config);
    }

    /**
     * Initialize the voice orb with a Lottie player
     * @param {string|HTMLElement} playerElement - Player element or ID
     * @param {string} animationSource - Path to Lottie JSON file
     * @returns {Promise<boolean>} Success status
     */
    async init(playerElement, animationSource = null) {
        try {
            // Get player element
            if (typeof playerElement === 'string') {
                this.player = document.getElementById(playerElement);
                this.playerId = playerElement;
            } else if (playerElement instanceof HTMLElement) {
                this.player = playerElement;
                this.playerId = playerElement.id || 'voice-orb-' + Date.now();
            } else {
                throw new Error('Invalid player element provided');
            }

            if (!this.player) {
                throw new Error('Player element not found');
            }

            // Set animation source if provided
            if (animationSource) {
                this.player.src = animationSource;
            }

            // Set initial properties
            this.player.loop = this.state.isLooping;
            this.player.speed = this.state.currentSpeed;

            // Setup event listeners
            this.setupEventListeners();

            this.state.isInitialized = true;
            this.log('Voice orb initialized successfully');

            // Trigger ready callback
            this.trigger('ready');

            return true;
        } catch (error) {
            this.log('Initialization failed:', error);
            this.trigger('error', error);
            return false;
        }
    }

    /**
     * Setup internal event listeners
     */
    setupEventListeners() {
        if (!this.player) return;

        this.player.addEventListener('ready', () => {
            this.log('Animation ready');
            this.trigger('ready');
        });

        this.player.addEventListener('complete', () => {
            if (!this.state.isLooping) {
                this.state.isPlaying = false;
                this.trigger('complete');
            }
        });

        this.player.addEventListener('error', (error) => {
            this.log('Animation error:', error);
            this.trigger('error', error);
        });
    }

    /**
     * Play the animation
     * @returns {boolean} Success status
     */
    play() {
        if (!this.isReady()) return false;

        try {
            this.player.play();
            this.state.isPlaying = true;
            this.log('Animation playing');
            this.trigger('play');
            return true;
        } catch (error) {
            this.log('Play failed:', error);
            return false;
        }
    }

    /**
     * Pause the animation
     * @returns {boolean} Success status
     */
    pause() {
        if (!this.isReady()) return false;

        try {
            this.player.pause();
            this.state.isPlaying = false;
            this.log('Animation paused');
            this.trigger('pause');
            return true;
        } catch (error) {
            this.log('Pause failed:', error);
            return false;
        }
    }

    /**
     * Stop the animation
     * @returns {boolean} Success status
     */
    stop() {
        if (!this.isReady()) return false;

        try {
            this.player.stop();
            this.state.isPlaying = false;
            this.log('Animation stopped');
            this.trigger('stop');
            return true;
        } catch (error) {
            this.log('Stop failed:', error);
            return false;
        }
    }

    /**
     * Set animation speed
     * @param {number} speed - Animation speed (0.1 - 3)
     * @returns {boolean} Success status
     */
    setSpeed(speed) {
        if (!this.isReady()) return false;

        const clampedSpeed = Math.max(this.config.minSpeed, Math.min(this.config.maxSpeed, speed));

        try {
            this.player.speed = clampedSpeed;
            this.state.currentSpeed = clampedSpeed;
            this.log('Speed set to:', clampedSpeed);
            this.trigger('speedChange', clampedSpeed);
            return true;
        } catch (error) {
            this.log('Set speed failed:', error);
            return false;
        }
    }

    /**
     * Set loop mode
     * @param {boolean} loop - Whether to loop the animation
     * @returns {boolean} Success status
     */
    setLoop(loop) {
        if (!this.isReady()) return false;

        try {
            this.player.loop = loop;
            this.state.isLooping = loop;
            this.log('Loop set to:', loop);
            this.trigger('loopChange', loop);
            return true;
        } catch (error) {
            this.log('Set loop failed:', error);
            return false;
        }
    }

    /**
     * Set voice level (affects speed and opacity)
     * @param {number} level - Voice level (0.1 - 3)
     * @returns {boolean} Success status
     */
    setVoiceLevel(level) {
        if (!this.isReady()) return false;

        const clampedLevel = Math.max(this.config.minVoiceLevel, Math.min(this.config.maxVoiceLevel, level));

        try {
            // Update speed based on voice level
            this.setSpeed(clampedLevel);

            // Update opacity based on voice level
            const opacity = Math.max(
                this.config.minOpacity,
                Math.min(this.config.maxOpacity, clampedLevel / 2)
            );
            this.player.style.opacity = opacity;

            this.state.voiceLevel = clampedLevel;
            this.state.opacity = opacity;

            this.log('Voice level set to:', clampedLevel);
            this.trigger('voiceChange', { level: clampedLevel, opacity });
            return true;
        } catch (error) {
            this.log('Set voice level failed:', error);
            return false;
        }
    }

    /**
     * Set opacity directly
     * @param {number} opacity - Opacity value (0-1)
     * @returns {boolean} Success status
     */
    setOpacity(opacity) {
        if (!this.isReady()) return false;

        const clampedOpacity = Math.max(0, Math.min(1, opacity));

        try {
            this.player.style.opacity = clampedOpacity;
            this.state.opacity = clampedOpacity;
            this.log('Opacity set to:', clampedOpacity);
            this.trigger('opacityChange', clampedOpacity);
            return true;
        } catch (error) {
            this.log('Set opacity failed:', error);
            return false;
        }
    }

    /**
     * Get current state
     * @returns {Object} Current state object
     */
    getState() {
        return {
            ...this.state,
            isReady: this.isReady(),
            playerId: this.playerId
        };
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('Configuration updated:', newConfig);
    }

    /**
     * Check if the voice orb is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.state.isInitialized && this.player !== null;
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Trigger event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    trigger(event, data = null) {
        // Trigger registered listeners
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data, this);
                } catch (error) {
                    this.log('Event callback error:', error);
                }
            });
        }

        // Trigger config callbacks
        const callbackName = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
        if (this.config[callbackName] && typeof this.config[callbackName] === 'function') {
            try {
                this.config[callbackName](data, this);
            } catch (error) {
                this.log('Config callback error:', error);
            }
        }
    }

    /**
     * Destroy the voice orb instance
     */
    destroy() {
        if (this.player) {
            // Remove event listeners
            this.player.removeEventListener('ready', () => {});
            this.player.removeEventListener('complete', () => {});
            this.player.removeEventListener('error', () => {});
        }

        // Clear state
        this.state.isInitialized = false;
        this.player = null;
        this.playerId = null;
        this.eventListeners.clear();

        this.log('Voice orb destroyed');
        this.trigger('destroy');
    }

    /**
     * Log helper
     * @param {...any} args - Arguments to log
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[VoiceOrbCore]', ...args);
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceOrbCore;
}

if (typeof window !== 'undefined') {
    window.VoiceOrbCore = VoiceOrbCore;
}

// AMD support
if (typeof define === 'function' && define.amd) {
    define('VoiceOrbCore', [], function() {
        return VoiceOrbCore;
    });
}
