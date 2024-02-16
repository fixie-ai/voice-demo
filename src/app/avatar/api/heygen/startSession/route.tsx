
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { session_id, sdp } = body;

    const SERVER_URL = process.env.HEYGEN_SERVER_URL || '';
    const apiKey = process.env.HEYGEN_API_KEY || '';
  
    try {
      const response = await fetch(`${SERVER_URL}/v1/streaming.start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({ session_id, sdp }),
      });
  
      if (response.status === 500) {
        console.error('Server error');
        return new Response('Server error', { status: 500 });
      }
  
      const data = await response.json();
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (error: any) {
      console.error('Error starting session:', error);
      return new Response(error.message, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(error.message, { status: 500 });
  }
  
}
