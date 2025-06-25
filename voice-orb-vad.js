/**
 * Voice Activity Detection (VAD) Module
 * Standalone module for detecting voice activity from microphone input
 *
 * @version 1.0.0
 * @author Voice Graphics
 * @license MIT
 */

class VoiceActivityDetector {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            // VAD settings
            threshold: 0.01,
            minDuration: 150,
            maxSilence: 800,
            sensitivity: 0.6,
            smoothing: 0.85,

            // Audio settings
            fftSize: 256,
            sampleRate: 44100,

            // Callbacks
            onVoiceStart: null,
            onVoiceEnd: null,
            onVoiceLevel: null,
            onError: null,

            // Debug
            debug: false,

            ...options
        };

        // State
        this.state = {
            isActive: false,
            isVoiceDetected: false,
            currentLevel: 0,
            smoothedLevel: 0,
            lastVoiceTime: 0,
            voiceStartTime: 0,
            silenceStartTime: 0,
            isConnected: false
        };

        // Audio components
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.stream = null;

        // Animation frame ID
        this.animationFrame = null;

        // Event listeners
        this.eventListeners = new Map();

        this.log('VoiceActivityDetector initialized', this.config);
    }

    /**
     * Connect to microphone and start VAD
     * @returns {Promise<boolean>} Success status
     */
    async connect() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(this.stream);

            // Configure analyser
            this.analyser.fftSize = this.config.fftSize;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Connect audio nodes
            this.microphone.connect(this.analyser);

            this.state.isConnected = true;
            this.log('Microphone connected successfully');

            return true;
        } catch (error) {
            this.log('Failed to connect microphone:', error);
            this.trigger('error', error);
            return false;
        }
    }

    /**
     * Start voice activity detection
     * @returns {boolean} Success status
     */
    start() {
        if (!this.state.isConnected) {
            this.log('Cannot start VAD: microphone not connected');
            return false;
        }

        if (this.state.isActive) {
            this.log('VAD already active');
            return true;
        }

        // Reset state
        this.resetVADState();

        this.state.isActive = true;
        this.startAnalysis();

        this.log('Voice activity detection started');
        return true;
    }

    /**
     * Stop voice activity detection
     * @returns {boolean} Success status
     */
    stop() {
        if (!this.state.isActive) {
            return true;
        }

        this.state.isActive = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Reset voice state
        if (this.state.isVoiceDetected) {
            this.state.isVoiceDetected = false;
            this.trigger('voiceEnd');
        }

        this.log('Voice activity detection stopped');
        return true;
    }

    /**
     * Disconnect microphone and cleanup
     */
    disconnect() {
        this.stop();

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.state.isConnected = false;

        this.log('Microphone disconnected');
    }

    /**
     * Start audio analysis loop
     */
    startAnalysis() {
        const analyze = () => {
            if (!this.state.isActive) return;

            // Get frequency data
            this.analyser.getByteFrequencyData(this.dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const average = sum / this.dataArray.length;
            const normalizedLevel = (average / 255) * this.config.sensitivity;

            // Process voice activity
            this.processVoiceActivity(normalizedLevel);

            // Schedule next analysis
            this.animationFrame = requestAnimationFrame(analyze);
        };

        analyze();
    }

    /**
     * Process voice activity detection logic
     * @param {number} level - Current audio level (0-1)
     */
    processVoiceActivity(level) {
        const now = Date.now();

        // Smooth the audio level
        this.state.smoothedLevel = this.state.smoothedLevel * this.config.smoothing +
                                   level * (1 - this.config.smoothing);

        this.state.currentLevel = level;

        // Trigger level callback
        this.trigger('voiceLevel', {
            raw: level,
            smoothed: this.state.smoothedLevel,
            timestamp: now
        });

        const isAboveThreshold = this.state.smoothedLevel > this.config.threshold;

        if (isAboveThreshold) {
            this.state.lastVoiceTime = now;

            // Check if we should start voice activity
            if (!this.state.isVoiceDetected) {
                if (this.state.voiceStartTime === 0) {
                    this.state.voiceStartTime = now;
                } else if (now - this.state.voiceStartTime >= this.config.minDuration) {
                    // Voice detected for minimum duration
                    this.state.isVoiceDetected = true;
                    this.state.silenceStartTime = 0;
                    this.log('Voice activity started');
                    this.trigger('voiceStart');
                }
            }
        } else {
            // Below threshold - potential silence
            if (this.state.isVoiceDetected && this.state.silenceStartTime === 0) {
                this.state.silenceStartTime = now;
            }

            // Reset voice start time if we haven't reached minimum duration
            if (!this.state.isVoiceDetected) {
                this.state.voiceStartTime = 0;
            }
        }

        // Check if we should stop due to silence
        if (this.state.isVoiceDetected && this.state.silenceStartTime > 0) {
            if (now - this.state.silenceStartTime >= this.config.maxSilence) {
                this.state.isVoiceDetected = false;
                this.state.voiceStartTime = 0;
                this.state.silenceStartTime = 0;
                this.log('Voice activity ended');
                this.trigger('voiceEnd');
            }
        }
    }

    /**
     * Reset VAD state
     */
    resetVADState() {
        this.state.isVoiceDetected = false;
        this.state.lastVoiceTime = 0;
        this.state.voiceStartTime = 0;
        this.state.silenceStartTime = 0;
        this.state.currentLevel = 0;
        this.state.smoothedLevel = 0;
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
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
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
     * Check if VAD is supported
     * @returns {boolean} Support status
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Log helper
     * @param {...any} args - Arguments to log
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[VoiceActivityDetector]', ...args);
        }
    }

    /**
     * Destroy the VAD instance
     */
    destroy() {
        this.disconnect();
        this.eventListeners.clear();
        this.log('VoiceActivityDetector destroyed');
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceActivityDetector;
}

if (typeof window !== 'undefined') {
    window.VoiceActivityDetector = VoiceActivityDetector;
}

// AMD support
if (typeof define === 'function' && define.amd) {
    define('VoiceActivityDetector', [], function() {
        return VoiceActivityDetector;
    });
}
