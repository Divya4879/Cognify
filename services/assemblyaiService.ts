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

  private async createTranscript(uploadUrl: string): Promise<string> {
    const response = await fetch(`${ASSEMBLYAI_API_BASE}/transcript`, {
        method: 'POST',
        headers: {
            'authorization': ASSEMBLYAI_API_KEY!,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_url: uploadUrl }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AssemblyAI transcription request failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async pollForTranscript(transcriptId: string): Promise<string> {
      const pollingEndpoint = `${ASSEMBLYAI_API_BASE}/transcript/${transcriptId}`;
      
      while (true) {
          const response = await fetch(pollingEndpoint, {
              headers: { 'authorization': ASSEMBLYAI_API_KEY! },
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`AssemblyAI polling failed: ${errorData.error || response.statusText}`);
          }
          
          const transcriptData = await response.json();

          if (transcriptData.status === 'completed') {
              if (transcriptData.text) {
                return transcriptData.text;
              }
              throw new Error('Transcription completed but no text was returned.');
          } else if (transcriptData.status === 'failed') {
              throw new Error(`AssemblyAI transcription failed: ${transcriptData.error}`);
          }
          
          await delay(5000); // Wait 5 seconds before polling again
      }
  }

  public async transcribeAudio(audioDataUrl: string): Promise<string> {
      try {
          const uploadUrl = await this.uploadFile(audioDataUrl);
          const transcriptId = await this.createTranscript(uploadUrl);
          const transcriptText = await this.pollForTranscript(transcriptId);
          return transcriptText;
      } catch (error) {
          console.error("Error in AssemblyAI service:", error);
          if (error instanceof Error) {
            throw new Error(`Transcription failed: ${error.message}`);
          }
          throw new Error("An unknown error occurred during transcription.");
      }
  }
}

export const assemblyaiService = new AssemblyAIService();