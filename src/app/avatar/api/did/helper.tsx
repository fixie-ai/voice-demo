

export async function doPost(url: string, data: any) {
  const SERVER_URL = process.env.DID_SERVER_URL || '';
  const apiKey = process.env.DID_API_KEY || '';
  const service = process.env.DID_SERVICE || '';

  url = `${SERVER_URL}/${service}${url}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const responseData = await response.json(); 


  return new Response(JSON.stringify(responseData), { status: response.status });
}
