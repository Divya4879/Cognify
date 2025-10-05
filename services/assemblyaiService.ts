const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AssemblyAIService {
  private async uploadFile(audioDataUrl: string): Promise<string> {
    const audioBlob = await (await fetch(audioDataUrl)).blob();
    const base64Data = await this.blobToBase64(audioBlob);
    
    const response = await fetch('/.netlify/functions/assemblyai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: '/upload',
        file: base64Data,
        contentType: audioBlob.type
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.upload_url;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async createTranscript(audioUrl: string): Promise<string> {
    const response = await fetch('/.netlify/functions/assemblyai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: '/transcripts',
        audio_url: audioUrl,
        speaker_labels: true
      })
    });

    if (!response.ok) {
      throw new Error(`Transcript creation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async getTranscript(transcriptId: string): Promise<any> {
    const response = await fetch('/.netlify/functions/assemblyai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: `/transcripts/${transcriptId}`
      })
    });

    if (!response.ok) {
      throw new Error(`Get transcript failed: ${response.statusText}`);
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
