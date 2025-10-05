const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_API_BASE = "https://api.assemblyai.com/v2";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AssemblyAIService {
  private async uploadFile(audioDataUrl: string): Promise<string> {
    if (!ASSEMBLYAI_API_KEY) {
        throw new Error("AssemblyAI API key is not configured.");
    }
    const audioBlob = await (await fetch(audioDataUrl)).blob();
    
    const response = await fetch(`${ASSEMBLYAI_API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': audioBlob.type,
      },
      body: audioBlob,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AssemblyAI upload failed: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.upload_url;
  }

  private async createTranscript(audioUrl: string): Promise<string> {
    if (!ASSEMBLYAI_API_KEY) {
        throw new Error("AssemblyAI API key is not configured.");
    }
    
    const response = await fetch(`${ASSEMBLYAI_API_BASE}/transcripts`, {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AssemblyAI transcript creation failed: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.id;
  }

  private async getTranscript(transcriptId: string): Promise<any> {
    if (!ASSEMBLYAI_API_KEY) {
        throw new Error("AssemblyAI API key is not configured.");
    }
    
    const response = await fetch(`${ASSEMBLYAI_API_BASE}/transcripts/${transcriptId}`, {
      method: 'GET',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
      },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AssemblyAI get transcript failed: ${errorData.error || response.statusText}`);
    }
    
    return await response.json();
  }

  async transcribeAudio(audioDataUrl: string): Promise<string> {
    try {
      const uploadUrl = await this.uploadFile(audioDataUrl);
      const transcriptId = await this.createTranscript(uploadUrl);
      
      let transcript;
      let attempts = 0;
      const maxAttempts = 60;
      
      do {
        await delay(2000);
        transcript = await this.getTranscript(transcriptId);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw new Error('Transcription timeout - please try again with a shorter audio file');
        }
      } while (transcript.status === 'processing' || transcript.status === 'queued');
      
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

export const assemblyAIService = new AssemblyAIService();
