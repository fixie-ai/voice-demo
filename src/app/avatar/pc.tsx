"use client";
import { GenerateData } from "./types";
import { ChromaKeyer } from "./chroma_key";

/**
 * Abstract class for a receive-only PeerConnection.
 * Signaling is handled by derived classes.
 */
export abstract class PeerConnectionClient extends EventTarget {
  private video: HTMLVideoElement;
  protected pc?: RTCPeerConnection;
  protected dc?: RTCDataChannel;
  private lastGenerateStart?: number;
  private audioTrackTimer?: NodeJS.Timeout;
  private chromaKeyer?: ChromaKeyer;
  private _avatarId?: string;
  private _voiceId?: string;
  private _backgroundColor = "#007F00";
  constructor(video: HTMLVideoElement, avatarId?: string, voiceId?: string) {
    super();
    this.video = video;
    this._avatarId = avatarId;
    this._voiceId = voiceId;
  }
  get connected(): boolean {
    return this.pc?.connectionState === "connected";
  }
  get avatarId(): string | undefined {
    return this._avatarId;
  }
  get voiceId(): string | undefined {
    return this._voiceId;
  }
  get backgroundColor(): string {
    return this._backgroundColor;
  }
  set backgroundColor(newColor: string) {
    this._backgroundColor = newColor;
  }
  abstract connect(): Promise<void>;
  abstract generate(data: GenerateData): Promise<void>;
  close() {
    if (this.audioTrackTimer) {
      clearInterval(this.audioTrackTimer);
    }
    this.pc?.close();
  }

  protected createPeerConnection(iceServers: RTCIceServer[]) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc.onconnectionstatechange = () => {
      const state = this.pc!.connectionState;
      console.log(`Connection state changed to: ${state}`);
      const ev = new CustomEvent("connectionState", { detail: state });
      this.dispatchEvent(ev);
    };
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.debug("Gathered ICE candidate:", candidate);
        this.sendICE(candidate);
      }
    };
    this.pc.ontrack = (event) => {
      console.log(
        `Received ${event.track.kind} track ${event.track.id} for stream ${event.streams[0].id}`,
      );
      if (event.track.kind === "video") {
        this.chromaKeyer = new ChromaKeyer(event.streams[0]);
        this.video.srcObject = this.chromaKeyer.stream ?? event.streams[0];
      } else if (event.track.kind === "audio") {
        // This works around an issue with the Azure avatars where the audio track is standalone.
        const stream = this.video.srcObject as MediaStream | null;
        if (stream && stream.getAudioTracks().indexOf(event.track) === -1) {
          console.log(
            "Received standalone audio track, adding to video stream.",
          );
          stream.addTrack(event.track);
        }
        this.audioTrackTimer = setInterval(async () => {
          const stats = await this.pc?.getStats(event.track);
          this.processAudioStats(stats!);
        }, 50);
      }
    };
    this.pc.ondatachannel = (event) => {
      console.log("Received data channel:", event);
      this.dc = event.channel;
      this.dc.onmessage = (ev) => {
        console.log("Received dc message:", ev.data);
      };
    };
  }
  protected sendICE(candidate: RTCIceCandidateInit) {}
  protected setGenerateStart() {
    this.lastGenerateStart = performance.now();
  }
  private processAudioStats(stats: RTCStatsReport) {
    // Calculate the time until the first non-silent audio is received.
    if (!this.lastGenerateStart) {
      return;
    }
    let audioLevel = 0;
    for (const [_, report] of stats.entries()) {
      if (report.type === "inbound-rtp" && report.kind === "audio") {
        audioLevel = report.audioLevel;
        break;
      }
    }
    if (!audioLevel || audioLevel < 0.01) {
      return;
    }

    const elapsed = performance.now() - this.lastGenerateStart;
    console.log(
      `Audio received: ${audioLevel.toFixed(3)}, elapsed: ${elapsed.toFixed(
        0,
      )}ms`,
    );
    this.lastGenerateStart = undefined;
  }
}

export abstract class RestPeerConnectionClient extends PeerConnectionClient {
  async connect() {
    if (this.pc) {
      console.error("Peer connection already exists");
      return;
    }
    await this.startSession();
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    await this.sendSDP(answer);
    console.log("Peer connection negotiation complete");
  }
  async generate(data: GenerateData) {
    if (!this.pc) {
      console.error("Peer connection does not exist");
      return;
    }
    console.log("Requesting generation with data:", data);
    super.setGenerateStart();
    await this.sendGenerate(data);
    console.log("Generation request complete");
  }
  async close() {
    if (!this.pc || this.pc.connectionState === "closed") {
      return;
    }
    // If stopSession fails, just eat the error.
    try {
      await this.stopSession();
    } catch (err) {
      console.log(`Error stopping session: ${err}`);
    }
    super.close();
  }
  protected abstract startSession(): Promise<void>;
  protected abstract stopSession(): Promise<void>;
  protected abstract sendSDP(sdp: RTCSessionDescriptionInit): Promise<void>;
  protected abstract sendICE(candidate: RTCIceCandidateInit): Promise<void>;
  protected abstract sendGenerate(data: GenerateData): Promise<void>;
}
