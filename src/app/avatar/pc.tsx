"use client";
import { GenerateData } from "./types";

/**
 * Abstract class for a receive-only PeerConnection.
 * Signaling is handled by derived classes.
 */
export abstract class PeerConnectionClient extends EventTarget {
  private video: HTMLVideoElement;
  protected pc?: RTCPeerConnection;
  private _backgroundColor = "#00FF00";
  constructor(video: HTMLVideoElement) {
    super();
    this.video = video;
  }
  get connected(): boolean {
    return this.pc?.connectionState === "connected";
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
        console.log("Gathered ICE candidate:", candidate);
        this.sendICE(candidate);
      }
    };
    this.pc.ontrack = (event) => {
      console.log(
        `Received ${event.track.kind} track ${event.track.id} for stream ${event.streams[0].id}`,
      );
      if (event.track.kind === "video") {
        this.video.srcObject = event.streams[0];
        this.video.play().catch((err) => {
          console.error("Error auto-playing video: ", err);
        });
      } else if (event.track.kind === "audio") {
        // This works around an issue with the Azure avatars where the audio track is standalone.
        const stream = this.video.srcObject as MediaStream | null;
        if (stream && stream.getAudioTracks().indexOf(event.track) === -1) {
          console.log(
            "Received standalone audio track, adding to video stream.",
          );
          stream.addTrack(event.track);
        }
      }
    };
    this.pc.ondatachannel = (event) => {
      console.log("Received data channel:", event);
    };
  }
  protected async sendICE(candidate: RTCIceCandidateInit) {}
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
    await this.sendGenerate(data);
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
