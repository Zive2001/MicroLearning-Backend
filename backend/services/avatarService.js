// const sdk = require("azure-cognitiveservices-speech-sdk");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { logger } = require("../utils/logger");
const config = require("../config/env");

/**
 * Service to handle 3D avatar and text-to-speech operations
 */
class AvatarService {
  constructor() {
    // Initialize speech configuration
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      config.AZURE_SPEECH_KEY,
      config.AZURE_SPEECH_REGION
    );

    // Set default voice
    this.speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

    // Avatar configuration
    this.avatarConfig = {
      defaultAvatar: "teacher",
      avatarStyles: {
        teacher: {
          voice: "en-US-JennyNeural",
          style: "friendly", // Azure Neural voice style
          speed: 1.0, // Normal speed
          pitch: 0, // Default pitch
        },
        assistant: {
          voice: "en-US-GuyNeural",
          style: "friendly",
          speed: 1.0,
          pitch: 0,
        },
      },
    };
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert to speech
   * @param {string} voiceName - Name of the voice to use
   * @param {string} outputFileName - Name of the output audio file
   * @returns {Promise<string>} - Path to the generated audio file
   */
  async textToSpeech(
    text,
    voiceName = "en-US-JennyNeural",
    outputFileName = "output.wav"
  ) {
    return new Promise((resolve, reject) => {
      try {
        // Set the specified voice
        this.speechConfig.speechSynthesisVoiceName = voiceName;

        // Create an audio output configuration
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputFileName);

        // Create the speech synthesizer
        const synthesizer = new sdk.SpeechSynthesizer(
          this.speechConfig,
          audioConfig
        );

        // Start the synthesis
        synthesizer.speakTextAsync(
          text,
          (result) => {
            // Handle successful synthesis
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              logger.info(
                `Speech synthesis succeeded for text: "${text.substring(
                  0,
                  50
                )}..."`
              );

              // Close the synthesizer
              synthesizer.close();

              // Resolve with the path to the audio file
              resolve(outputFileName);
            } else {
              const errorDetails = `Speech synthesis failed: ${result.errorDetails}`;
              logger.error(errorDetails);

              // Close the synthesizer
              synthesizer.close();

              // Reject with error details
              reject(new Error(errorDetails));
            }
          },
          (error) => {
            logger.error(`Error during speech synthesis: ${error}`);

            // Close the synthesizer
            synthesizer.close();

            // Reject with error
            reject(error);
          }
        );
      } catch (error) {
        logger.error("Error initializing speech synthesis:", error);
        reject(error);
      }
    });
  }

  /**
   * Generate SSML (Speech Synthesis Markup Language) from avatar script
   * @param {string} script - Avatar script
   * @param {string} avatarType - Type of avatar (teacher, assistant)
   * @returns {string} - SSML for speech synthesis
   */
  generateSSML(script, avatarType = "teacher") {
    try {
      // Get avatar style configuration
      const style =
        this.avatarConfig.avatarStyles[avatarType] ||
        this.avatarConfig.avatarStyles.teacher;

      // Extract voice parameters
      const { voice, style: voiceStyle, speed, pitch } = style;

      // Create basic SSML structure
      let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">`;

      // Add voice and style settings
      ssml += `<voice name="${voice}">`;

      // Add global prosody settings for rate and pitch
      ssml += `<prosody rate="${speed}" pitch="${pitch}hz">`;

      // Process the script to add SSML tags for emphasis, pauses, etc.
      // Replace emphasis markers with SSML tags
      let processedScript = script
        // Replace *emphasized text* with <emphasis> tags
        .replace(/\*(.*?)\*/g, "<emphasis>$1</emphasis>")
        // Replace [pause] with <break> tags
        .replace(/\[pause\]/gi, '<break time="1s"/>')
        .replace(/\[short pause\]/gi, '<break time="500ms"/>')
        .replace(/\[long pause\]/gi, '<break time="2s"/>')
        // Replace (gesture:...) with empty string (gestures are handled by avatar, not speech)
        .replace(/\(gesture:.*?\)/g, "")
        // Replace (emotion:...) with appropriate SSML emotion
        .replace(
          /\(emotion:\s*happy\)/gi,
          `<mstts:express-as style="cheerful">`
        )
        .replace(/\(emotion:\s*sad\)/gi, `<mstts:express-as style="sad">`)
        .replace(
          /\(emotion:\s*excited\)/gi,
          `<mstts:express-as style="excited">`
        )
        .replace(/\(\/emotion\)/gi, `</mstts:express-as>`);

      // Add the processed script to the SSML
      ssml += processedScript;

      // Close the prosody, voice, and speak tags
      ssml += `</prosody></voice></speak>`;

      return ssml;
    } catch (error) {
      logger.error("Error generating SSML:", error);

      // Return a simple SSML as fallback
      return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-JennyNeural">${script}</voice>
      </speak>`;
    }
  }

  /**
   * Generate avatar animation script
   * @param {string} script - Avatar script
   * @returns {Object} - Animation script for the avatar
   */
  generateAvatarAnimationScript(script) {
    try {
      // Extract gesture instructions from the script
      const gesturePattern = /\(gesture:\s*(.*?)\)/g;
      const emotions = [];
      const gestures = [];
      let match;

      // Find all gesture instructions
      while ((match = gesturePattern.exec(script)) !== null) {
        gestures.push({
          type: match[1].trim(),
          time: match.index,
        });
      }

      // Extract emotion instructions
      const emotionPattern = /\(emotion:\s*(.*?)\)/g;

      // Find all emotion instructions
      while ((match = emotionPattern.exec(script)) !== null) {
        emotions.push({
          type: match[1].trim(),
          time: match.index,
        });
      }

      // Clean script from gesture and emotion instructions
      const cleanScript = script
        .replace(/\(gesture:.*?\)/g, "")
        .replace(/\(emotion:.*?\)/g, "")
        .replace(/\(\/emotion\)/g, "");

      return {
        script: cleanScript,
        animations: {
          gestures,
          emotions,
        },
      };
    } catch (error) {
      logger.error("Error generating avatar animation script:", error);

      // Return a basic script as fallback
      return {
        script,
        animations: {
          gestures: [],
          emotions: [],
        },
      };
    }
  }

  /**
   * Generate a complete avatar presentation
   * @param {string} avatarScript - Script for the avatar
   * @param {string} avatarType - Type of avatar (teacher, assistant)
   * @param {string} outputFileName - Name of the output audio file
   * @returns {Promise<Object>} - Avatar presentation data
   */
  async generateAvatarPresentation(
    avatarScript,
    avatarType = "teacher",
    outputFileName = "output.wav"
  ) {
    try {
      // Generate animation script
      const animationScript = this.generateAvatarAnimationScript(avatarScript);

      // Generate SSML
      const ssml = this.generateSSML(animationScript.script, avatarType);

      // Generate speech audio
      const audioFilePath = await this.textToSpeech(
        ssml,
        this.avatarConfig.avatarStyles[avatarType].voice,
        outputFileName
      );

      // Return the complete presentation data
      return {
        audioFilePath,
        animationScript,
        avatarType,
        duration: this.estimateSpeechDuration(animationScript.script), // Estimate duration in seconds
      };
    } catch (error) {
      logger.error("Error generating avatar presentation:", error);
      throw new Error("Failed to generate avatar presentation");
    }
  }

  /**
   * Estimate speech duration based on word count
   * @param {string} text - Text to estimate duration for
   * @returns {number} - Estimated duration in seconds
   */
  estimateSpeechDuration(text) {
    // Average speaking rate is about 150 words per minute (or 2.5 words per second)
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 2.5;

    // Calculate basic duration
    let duration = words / wordsPerSecond;

    // Add time for pauses
    const shortPauses = (text.match(/\[short pause\]/gi) || []).length;
    const longPauses = (text.match(/\[long pause\]/gi) || []).length;
    const regularPauses = (text.match(/\[pause\]/gi) || []).length;

    duration += shortPauses * 0.5; // 0.5 seconds for short pauses
    duration += longPauses * 2; // 2 seconds for long pauses
    duration += regularPauses * 1; // 1 second for regular pauses

    // Add buffer time
    duration *= 1.1; // Add 10% buffer

    return Math.round(duration);
  }
}

module.exports = new AvatarService();
