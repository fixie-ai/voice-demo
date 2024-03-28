import { GenerateData } from "./types";
import { doPost } from "./invoke";
import { RestPeerConnectionClient } from "./pc";

//const DEFAULT_TTS_VOICE = "en-US-JennyNeural";

export class HeyGenClient extends RestPeerConnectionClient {
  private sessionId?: string;
  protected async startSession() {
    const body = { quality: "high" }; //, voice: { voice_id: DEFAULT_TTS_VOICE } };
    const { data } = await this.post("new", body);
    this.sessionId = data.session_id;
    this.createPeerConnection(data.ice_servers2);
    await this.pc!.setRemoteDescription(data.sdp);
  }
  protected async stopSession() {
    const body = { session_id: this.sessionId };
    await this.post("stop", body);
  }
  protected async sendSDP(sdp: RTCSessionDescriptionInit) {
    const body = { session_id: this.sessionId, sdp };
    await this.post("start", body);
  }
  protected async sendICE(candidate: RTCIceCandidateInit) {
    const body = { session_id: this.sessionId, candidate };
    await this.post("ice", body);
  }
  protected async sendGenerate(data: GenerateData) {
    const body = { session_id: this.sessionId, text: data.text?.text };
    await this.post("task", body);
  }
  private post(method: string, data: any) {
    const path = "/avatar/api/heygen/v1/streaming." + method;
    return doPost(path, data);
  }
}
