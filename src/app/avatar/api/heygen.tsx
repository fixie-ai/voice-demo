import { SessionData, SessionResponse, GenerateData } from '../types';
import { ServiceHandler } from './base';

async function invoke(method: string, path: string, data?: any) {
  const SERVER_URL = process.env.HEYGEN_SERVER_URL || '';
  const API_KEY = process.env.HEYGEN_API_KEY || '';
  const url = `${SERVER_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const responseData = await response.json(); 
  return new Response(JSON.stringify(responseData), { status: response.status });
}

async function doPost(path: string, data?: any) {
  return invoke('POST', path, data);
}

function buildPath(suffix?: string): string {
  return "/v1/streaming." + suffix;
}

export class HeyGenHandler implements ServiceHandler {
  async start(): Promise<SessionResponse> {
    const body = { quality: "high" };
    const resp = await doPost(buildPath("new"), body);
    const outBody = await resp.json();
    const data = outBody.data;
    return { session_id: data.session_id, ice_servers: data.ice_servers2, sdp: data.sdp };
  }
  async stop(session: SessionData): Promise<void> {
    const body = { session_id: session.session_id };
    await doPost(buildPath("stop"), body);
  }
  async sdp(session: SessionData, sdp: RTCSessionDescriptionInit): Promise<void> {
    const body = { session_id: session.session_id, sdp };
    await doPost(buildPath("start"), body); 
  }
  async ice(session: SessionData, candidate: RTCIceCandidateInit): Promise<void> {
    const body = { session_id: session.session_id, candidate };
    await doPost(buildPath("ice"), body); 
  }
  async generate(session: SessionData, data: GenerateData): Promise<void> {
    const body = { session_id: session.session_id, text: data.text};
    await doPost(buildPath("task"), body);
  }
}

/*
const postBody = {
  script: {
    type: 'text', 
    input: body.text //audio_url: body.audio_url, //hardcoded for now
  }, 
  ...(body.service === 'clips' && {
    background: {
      color: false,
    },
    config: {
      result_format: "webm"
    },    
  }),
  config: {
    stitch: true,
  },
  session_id: body.session_id,
};
*/
