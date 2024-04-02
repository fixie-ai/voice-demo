const TTS_REGION = "westus2";
const TTS_API_KEY = process.env.AZURE_WESTUS2_TTS_API_KEY;

export async function GET(req: Request): Promise<Response> {
  const tokenUrl = `https://${TTS_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
  const iceUrl = `https://${TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`;
  const tokenPromise = await invoke("POST", tokenUrl);
  const icePromise = await invoke("GET", iceUrl);
  const [token, iceData] = await Promise.all([tokenPromise, icePromise]);
  const out = {
    token,
    region: TTS_REGION,
    iceServers: makeIceServers(iceData),
  };
  return Response.json(out);
}

async function invoke(method: string, url: string) {
  if (!TTS_API_KEY) {
    throw new Error("TTS_API_KEY is not set");
  }
  const response = await fetch(url, {
    method,
    headers: { "Ocp-Apim-Subscription-Key": TTS_API_KEY },
    cache: 'no-store'
  });
  const responseData = await response.text();
  if (!response.ok) {
    console.error(response.status, response.statusText);
    throw new Error("Server error");
  }
  return responseData;
}

function makeIceServers(data: string) {
  const obj = JSON.parse(data);
  return [
    {
      urls: obj.Urls,
      username: obj.Username,
      credential: obj.Password,
    },
  ];
}
