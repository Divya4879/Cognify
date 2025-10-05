import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
});

class AssemblyAIService {
  async transcribeAudio(audioDataUrl: string): Promise<string> {
    try {
      if (!process.env.ASSEMBLYAI_API_KEY) {
        throw new Error("AssemblyAI API key is not configured.");
      }

      // Convert data URL to file
      const response = await fetch(audioDataUrl);
      const audioBlob = await response.blob();
      const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

      // Transcribe using AssemblyAI SDK
      const transcript = await client.transcripts.transcribe({
        audio: audioFile,
        speech_model: 'best'
      });

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      return transcript.text || 'No transcription available';
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      throw error;
    }
  }
}

export const assemblyaiService = new AssemblyAIService();
