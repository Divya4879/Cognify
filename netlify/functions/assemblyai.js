exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { endpoint, file, contentType, ...body } = JSON.parse(event.body);
    
    let url, options;
    
    if (endpoint === '/upload') {
      // Handle file upload
      const buffer = Buffer.from(file.split(',')[1], 'base64');
      url = 'https://api.assemblyai.com/v2/upload';
      options = {
        method: 'POST',
        headers: {
          'Authorization': process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': contentType || 'audio/wav'
        },
        body: buffer
      };
    } else {
      // Handle other API calls
      url = `https://api.assemblyai.com/v2${endpoint}`;
      options = {
        method: endpoint.includes('/transcripts/') && !body.audio_url ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.ASSEMBLYAI_API_KEY
        }
      };
      
      if (options.method === 'POST') {
        options.body = JSON.stringify(body);
      }
    }
    
    const response = await fetch(url, options);
    const data = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
