"use client";
import { SessionData, SessionResponse, GenerateData } from "./types";
import { ChromaKeyer } from "./chroma_key";

async function invoke(method: string, path: string, data: any) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    console.error(response.status, "Server error", response);
    throw new Error("Server error");
  }
  return await response.json();
}

async function doPost(path: string, data: any) {
  return invoke("POST", path, data);
}

async function startSession(session: SessionData): Promise<SessionResponse> {
  return doPost(`/avatar/api/start`, { session });
}

async function handleSDP(session: SessionData, sdp: RTCSessionDescriptionInit) {
  return doPost(`/avatar/api/sdp`, { session, sdp });
}

async function handleICE(session: SessionData, candidate: RTCIceCandidateInit) {
  return doPost(`/avatar/api/ice`, { session, candidate });
}

async function generate(session: SessionData, data: GenerateData) {
  return doPost(`/avatar/api/generate`, { session, data });
}

async function stopSession(session: SessionData) {
  return doPost(`/avatar/api/stop`, { session });
}

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
        this.handleICE(candidate);
      }
    };
    this.pc.ontrack = (event) => {
      console.log(
        `Received ${event.track.kind} track ${event.track.id} for stream ${event.streams[0].id}`,
      );
      if (event.track.kind === "video") {
        this.chromaKeyer = new ChromaKeyer(event.streams[0]);
        this.video.srcObject = this.chromaKeyer.stream;
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
  protected setGenerateStart() {
    this.lastGenerateStart = performance.now();
  }
  protected abstract handleICE(candidate: RTCIceCandidateInit): void;
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

/**
 * PeerConnectionClient that uses our REST API for signaling.
 */
export class RestPeerConnectionClient extends PeerConnectionClient {
  private session: SessionData;
  constructor(video: HTMLVideoElement, provider: string, service?: string) {
    super(video);
    this.session = { provider, service };
  }
  async connect() {
    if (this.pc) {
      console.error("Peer connection already exists");
      return;
    }
    const { session_id, stream_id, ice_servers, sdp } = await startSession(
      this.session,
    );
    this.session.session_id = session_id;
    this.session.stream_id = stream_id;
    this.createPeerConnection(ice_servers);
    await this.pc!.setRemoteDescription(sdp);
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    await handleSDP(this.session!, answer);
    console.log("Peer connection negotiation complete");
  }
  async generate(data: GenerateData) {
    if (!this.pc) {
      console.error("Peer connection does not exist");
      return;
    }
    console.log("Requesting generation with data:", data);
    if (!data.background_color) {
      data.background_color = this.backgroundColor;
    }
    super.setGenerateStart();
    await generate(this.session!, data);
    console.log("Generation request complete");
  }
  async close() {
    if (!this.pc || this.pc.connectionState === "closed") {
      return;
    }
    // If stopSession fails, just eat the error.
    try {
      await stopSession(this.session);
    } catch (err) {
      console.log(`Error stopping session: ${err}`);
    }
    super.close();
  }
  protected handleICE(candidate: RTCIceCandidateInit) {
    handleICE(this.session, candidate);
  }
}
