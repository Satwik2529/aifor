/**
 * Text-to-Speech Service using Google Cloud TTS REST API
 * Supports Hindi, Telugu, and English voices
 */

const axios = require('axios');

class TTSService {
    constructor() {
        this.apiKey = null;
        this.isConfigured = false;
        this.baseUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';
        this.initClient();
    }

    /**
     * Initialize Google TTS client
     */
    initClient() {
        // TTS disabled - using browser speech synthesis instead
        // To enable: set GOOGLE_TTS_API_KEY and enable Cloud Text-to-Speech API in Google Cloud Console
        this.isConfigured = false;
        console.log('ℹ️  Backend TTS disabled - using browser speech synthesis');
    }

    /**
     * Get voice configuration for each language
     */
    getVoiceConfig(language) {
        const voiceConfigs = {
            'en': {
                languageCode: 'en-IN',
                name: 'en-IN-Standard-D', // Male voice
                ssmlGender: 'MALE'
            },
            'hi': {
                languageCode: 'hi-IN',
                name: 'hi-IN-Standard-D', // Male voice for Hindi
                ssmlGender: 'MALE'
            },
            'te': {
                languageCode: 'te-IN',
                name: 'te-IN-Standard-A', // Female voice for Telugu
                ssmlGender: 'FEMALE'
            }
        };

        return voiceConfigs[language] || voiceConfigs['en'];
    }

    /**
     * Generate speech from text
     * @param {string} text - Text to convert to speech
     * @param {string} language - Language code (en, hi, te)
     * @returns {Promise<Buffer>} Audio buffer
     */
    async synthesizeSpeech(text, language = 'en') {
        if (!this.isConfigured) {
            throw new Error('Google TTS not configured');
        }

        try {
            const voiceConfig = this.getVoiceConfig(language);

            const requestBody = {
                input: { text: text },
                voice: {
                    languageCode: voiceConfig.languageCode,
                    name: voiceConfig.name,
                    ssmlGender: voiceConfig.ssmlGender
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 0.95,
                    pitch: 0,
                    volumeGainDb: 0
                }
            };

            console.log(`🔊 Generating speech for language: ${language} (${voiceConfig.languageCode})`);

            const response = await axios.post(
                `${this.baseUrl}?key=${this.apiKey}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.data || !response.data.audioContent) {
                throw new Error('No audio content received from Google TTS');
            }

            // Convert base64 to buffer
            const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
            
            console.log('✅ Speech generated successfully');
            return audioBuffer;

        } catch (error) {
            console.error('❌ TTS Error:', error.response?.data || error.message);
            throw error;
        }
    }


    /**
     * Check if TTS is available
     */
    isAvailable() {
        return this.isConfigured;
    }
}

module.exports = new TTSService();
