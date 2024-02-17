

export async function doPost(url: string, data: any) {
  const SERVER_URL = process.env.HEYGEN_SERVER_URL || '';
  const apiKey = process.env.HEYGEN_API_KEY || '';

  url = `${SERVER_URL}${url}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(data),
  });
  const responseData = await response.json(); 
  return new Response(JSON.stringify(responseData), { status: response.status });
}