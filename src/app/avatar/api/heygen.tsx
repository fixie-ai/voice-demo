import { SessionData, SessionResponse, GenerateData } from "../types";
import { ServiceHandler } from "./base";
import { Invoker } from "./invoker";

const invoker = new Invoker(
  "https://api.heygen.com",
  undefined,
  process.env.HEYGEN_API_KEY,
);
//const DEFAULT_TTS_VOICE = "en-US-JennyNeural";

function buildPath(suffix?: string): string {
  return "/v1/streaming." + suffix;
}

export class HeyGenHandler implements ServiceHandler {
  async start(): Promise<SessionResponse> {
    const body = { quality: "high" }; //, voice: { voice_id: DEFAULT_TTS_VOICE } };
    const resp = await invoker.post(buildPath("new"), body);
    const outBody = await resp.json();
    const data = outBody.data;
    return {
      session_id: data.session_id,
      ice_servers: data.ice_servers2,
      sdp: data.sdp,
    };
  }
  async stop(session: SessionData): Promise<void> {
    const body = { session_id: session.session_id };
    await invoker.post(buildPath("stop"), body);
  }
  async sdp(
    session: SessionData,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    const body = { session_id: session.session_id, sdp };
    await invoker.post(buildPath("start"), body);
  }
  async ice(
    session: SessionData,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const body = { session_id: session.session_id, candidate };
    await invoker.post(buildPath("ice"), body);
  }
  async generate(session: SessionData, data: GenerateData): Promise<void> {
    const body = { session_id: session.session_id, text: data.text?.text };
    await invoker.post(buildPath("task"), body);
  }
}
