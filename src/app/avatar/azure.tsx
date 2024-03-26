import { GenerateData } from "./types";
import { PeerConnectionClient } from "./pc";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

const DEFAULT_TTS_VOICE = "en-US-JennyNeural";
const DEFAULT_AVATAR_CHARACTER = "lisa";
const DEFAULT_AVATAR_STYLE = "casual-sitting";

export class AzureClient extends PeerConnectionClient {
  private synth?: SpeechSDK.AvatarSynthesizer;
  constructor(video: HTMLVideoElement) {
    super(video);
  }
  async connect() {
    const { token, region, iceServers } = await this.fetchToken();
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      token!,
      region!,
    );
    speechConfig.speechSynthesisVoiceName = DEFAULT_TTS_VOICE;
    const character = DEFAULT_AVATAR_CHARACTER;
    const style = DEFAULT_AVATAR_STYLE;
    // Crop from 1080p to square.
    const format = new SpeechSDK.AvatarVideoFormat();
    format.setCropRange(
      new SpeechSDK.Coordinate(420, 0),
      new SpeechSDK.Coordinate(1500, 1080),
    );
    const avatarConfig = new SpeechSDK.AvatarConfig(character, style, format);
    avatarConfig.backgroundColor = this.backgroundColor + "FF"; // need to add alpha byte
    this.synth = new SpeechSDK.AvatarSynthesizer(speechConfig, avatarConfig);
    this.synth.avatarEventReceived = (s: any, e: any) => {
      let offsetMessage =
        e.offset !== 0 ? `, offset=${e.offset / 10000}ms.` : "";
      console.log(`Event: ${e.description}${offsetMessage}`);
    };

    // Set up PeerConnection to receive audio and video.
    this.createPeerConnection(iceServers);
    this.pc!.addTransceiver("video", { direction: "sendrecv" });
    this.pc!.addTransceiver("audio", { direction: "sendrecv" });
    await this.synth.startAvatarAsync(this.pc!);
  }
  async generate(data: GenerateData) {
    this.synth?.speakTextAsync(data.text!.text);
  }
  close() {
    this.synth?.close();
    super.close();
  }
  protected handleICE(event: RTCIceCandidateInit) {
    // Do nothing, like any modern RTC service.
  }
  private async fetchToken() {
    const url = "/avatar/api/token?provider=azure";
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Failed to get token", resp);
      throw new Error("Failed to get token");
    }
    return await resp.json();
  }
}
