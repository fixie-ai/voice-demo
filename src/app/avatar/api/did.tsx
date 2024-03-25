import { SessionData, SessionResponse, GenerateData } from '../types';
import { ServiceHandler } from './base';
 
const SOURCE_URL = 'https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg';
const PRESENTER_ID = 'rian-lZC6MmWfC1';
const DRIVER_ID = 'mXra4jY38i';

async function invoke(method: string, path: string, data?: any) {
  const SERVER_URL = process.env.DID_SERVER_URL || '';
  const API_KEY = process.env.DID_API_KEY || '';
  const url = `${SERVER_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const responseData = await response.json(); 
  if (!response.ok) {
    console.error(response.status, 'Server error', responseData);
    throw new Error('Server error');
  }
  return new Response(JSON.stringify(responseData), { status: response.status });
}

async function doPost(path: string, data?: any) {
  return invoke('POST', path, data);
}

function buildPath(prefix: string, session?: SessionData, suffix?: string): string {
  let path = "/" + prefix + "/streams"
  if (session) {
    path += `/${session.stream_id}`;
  }
  if (suffix) {
    path += `/${suffix}`;
  }
  return path;
}

export class DIDHandler implements ServiceHandler {
  constructor(private service: string) {}
  async start(): Promise<SessionResponse> {
    let body;
    // TODO(juberti): Pass this up from the client.
    if (this.service == "talks") { 
      body = { source_url: SOURCE_URL };
    } else {
      body = { presenter_id: PRESENTER_ID, driver_id: DRIVER_ID };
    }
    const resp = await doPost(buildPath(this.service), body);
    const outBody = await resp.json();
    return { session_id: outBody.session_id, stream_id: outBody.id, ice_servers: outBody.ice_servers, sdp: outBody.offer };
  }
  async stop(session: SessionData): Promise<void> {
    const body = { session_id: session.session_id };
    await invoke("DELETE", buildPath(this.service, session), body);
  }
  async sdp(session: SessionData, sdp: RTCSessionDescriptionInit): Promise<void> {
    const body = { session_id: session.session_id, answer: sdp };
    await doPost(buildPath(this.service, session, "sdp"), body); 
  }
  async ice(session: SessionData, candidate: RTCIceCandidateInit): Promise<void> {
    const body = { session_id: session.session_id, candidate: candidate.candidate, sdpMLineIndex: candidate.sdpMLineIndex, sdpMid: candidate.sdpMid }
    await doPost(buildPath(this.service, session, "ice"), body); 
  }
  async generate(session: SessionData, data: GenerateData): Promise<void> {
    const script = { type: 'text', input: data.text };
    const body = { 
      session_id: session.session_id, 
      script,
      background: { color: '#FFFFFF' },
      config: { stitch: true }
    };
    await doPost(buildPath(this.service, session), body);
  }
}

export class DIDTalksHandler extends DIDHandler {
  constructor() {
    super("talks");
  }
}

export class DIDClipsHandler extends DIDHandler {
  constructor() {
    super("clips");
  }
}
