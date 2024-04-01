import { GenerateData } from "./types";
import { RestPeerConnectionClient } from "./pc";
import { doDelete, doPost } from "./invoke";

const DEFAULT_TTS_PROVIDER = "microsoft";
const DEFAULT_TTS_VOICE = "en-US-JennyNeural";

abstract class DidClient extends RestPeerConnectionClient {
  private sessionId?: string;
  private streamId?: string;
  constructor(
    mediaElement: HTMLVideoElement,
    private service: string,
    avatarId: string,
    voiceId = DEFAULT_TTS_VOICE,
  ) {
    super(mediaElement, avatarId, voiceId);
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
        voice_id: this.voiceId,
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
    return doPost(this.buildPath(method), data);
  }
  private delete(method: string, data: any) {
    return doDelete(this.buildPath(method), data);
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
  constructor(
    mediaElement: HTMLVideoElement,
    avatarId: string,
    voiceId?: string,
  ) {
    super(mediaElement, "talks", avatarId, voiceId);
  }
  protected buildStartRequest() {
    return { source_url: this.avatarId };
  }
}

export class DidClipsClient extends DidClient {
  constructor(
    mediaElement: HTMLVideoElement,
    avatarId: string,
    voiceId?: string,
  ) {
    super(mediaElement, "clips", avatarId, voiceId);
  }
  protected buildStartRequest() {
    const [presenter_id, driver_id] = this.avatarId!.split("/");
    return { presenter_id, driver_id };
  }
}
