import { GenerateData } from "./types";
import { RestPeerConnectionClient } from "./pc";
import { invoke } from "./invoke";

const DEFAULT_TTS_PROVIDER = "microsoft";
const DEFAULT_TTS_VOICE = "en-US-JennyNeural";

abstract class DidClient extends RestPeerConnectionClient {
  private sessionId?: string;
  private streamId?: string;
  constructor(
    mediaElement: HTMLVideoElement,
    private service: string,
    private voiceId = DEFAULT_TTS_VOICE,
  ) {
    super(mediaElement);
  }
  protected async startSession() {
    const body = this.buildStartRequest();
    const { session_id, id, ice_servers, offer } = await this.post("", body);
    this.sessionId = session_id;
    this.streamId = id;
    this.createPeerConnection(ice_servers);
    await this.pc!.setRemoteDescription(offer);
  }
  protected abstract buildStartRequest(): any;
  protected async stopSession() {
    const body = { session_id: this.sessionId };
    await this.delete("", body);
  }
  protected async sendSDP(sdp: RTCSessionDescriptionInit) {
    const body = { session_id: this.sessionId, answer: sdp };
    await this.post("sdp", body);
  }
  protected async sendICE(candidate: RTCIceCandidateInit) {
    const body = {
      session_id: this.sessionId,
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
    };
    await this.post("ice", body);
  }
  protected async sendGenerate(data: GenerateData) {
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
      session_id: this.sessionId,
      script,
      background: { color: this.backgroundColor },
      //config: { stitch: true, result_format: "webm" },
    };
    await this.post("", body);
  }
  private post(method: string, data: any) {
    return invoke("POST", this.buildPath(method), data);
  }
  private delete(method: string, data: any) {
    return invoke("DELETE", this.buildPath(method), data);
  }
  private buildPath(method: string) {
    let path = `/avatar/api/did/${this.service}/streams`;
    if (this.streamId) {
      path += `/${this.streamId}`;
    }
    if (method) {
      path += `/${method}`;
    }
    return path;
  }
}

export class DidTalksClient extends DidClient {
  constructor(mediaElement: HTMLVideoElement, private sourceUrl: string, voiceId?: string) {
    super(mediaElement, "talks", voiceId);
  }
  protected buildStartRequest() {
    return { source_url: this.sourceUrl };
  }
}

export class DidClipsClient extends DidClient {
  constructor(mediaElement: HTMLVideoElement, private presenterId: string, private driverId: string, voiceId?: string) {
    super(mediaElement, "clips", voiceId);
  }
  protected buildStartRequest() {
    return { presenter_id: this.presenterId, driver_id: this.driverId };
  }
}
