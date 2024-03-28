import { GenerateData } from "./types";
import { invoke, doPost } from "./invoke";
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
    while (true) {
      const resp = await invoke("POST", this.buildPath("task"), body);
      if (!resp.ok) {
        const { code, message } = await resp.json();
        console.warn("Failed to generate:", message);
        if (code === 10002) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          console.log("Retrying generation...");
          continue;
        }
      }
      break;
    }
  }
  private post(method: string, data: any) {
    return doPost(this.buildPath(method), data);
  }
  private buildPath(method: string) {
    return `/avatar/api/heygen/v1/streaming.${method}`;
  }
}
