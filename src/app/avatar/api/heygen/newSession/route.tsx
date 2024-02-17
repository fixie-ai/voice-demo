export async function POST(req: Request): Promise<Response> {
  try {
    console.log('POST request received');
    const body = await req.json();
    const { quality, avatar_name, voice_id } = body;
    
    const SERVER_URL = process.env.HEYGEN_SERVER_URL || '';
    const apiKey = process.env.HEYGEN_API_KEY || '';

    const response = await fetch(`${SERVER_URL}/v1/streaming.new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ quality, avatar_name, voice: { voice_id } }),
    });

    if (response.status === 500) {
      console.error('Server error');
      return new Response('Server error', { status: 500 });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(error.message, { status: 500 });
  }
}
