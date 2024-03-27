import { SessionData, SessionResponse, GenerateData } from "../types";
import { ServiceHandler } from "./base";
import { Invoker } from "./invoker";

const DEFAULT_TTS_PROVIDER = "microsoft";
const DEFAULT_TTS_VOICE = "en-US-JennyNeural";

const SOURCE_URL = "https://i.imgur.com/ltxHLqK.jpg"; // Dr. Donut worker
const PRESENTER_ID = "amy-Aq6OmGZnMt"; // Amy
const DRIVER_ID = "hORBJB77ln"; // Amy-specifc driver

const invoker = new Invoker("https://api.d-id.com", process.env.DID_API_KEY);

function buildPath(
  prefix: string,
  session?: SessionData,
  suffix?: string,
): string {
  let path = "/" + prefix + "/streams";
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
    const outBody = await invoker.post(buildPath(this.service), body);
    return {
      session_id: outBody.session_id,
      stream_id: outBody.id,
      ice_servers: outBody.ice_servers,
      sdp: outBody.offer,
    };
  }
  async stop(session: SessionData): Promise<void> {
    const body = { session_id: session.session_id };
    await invoker.delete(buildPath(this.service, session), body);
  }
  async sdp(
    session: SessionData,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    const body = { session_id: session.session_id, answer: sdp };
    await invoker.post(buildPath(this.service, session, "sdp"), body);
  }
  async ice(
    session: SessionData,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const body = {
      session_id: session.session_id,
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
    };
    await invoker.post(buildPath(this.service, session, "ice"), body);
  }
  async generate(session: SessionData, data: GenerateData): Promise<void> {
    const script = {
      type: "text",
      input: data.text?.text,
      provider: {
        type: DEFAULT_TTS_PROVIDER,
        voice_id: DEFAULT_TTS_VOICE,
      },
    };
    //const script = { type: "audio", audio_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/webrtc.mp3'};
    const body = {
      session_id: session.session_id,
      script,
      background: { color: data.background_color ?? "#FFFFFF" },
      //config: { stitch: true, result_format: "webm" },
    };
    await invoker.post(buildPath(this.service, session), body);
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
