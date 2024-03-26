"use client";
import { SessionData, SessionResponse, GenerateData } from "./types";

async function invoke(method: string, path: string, data: any) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (response.status !== 200) {
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

export abstract class PeerConnectionClient extends EventTarget {
  private video: HTMLVideoElement;
  protected pc?: RTCPeerConnection;
  private _backgroundColor = "#FFFFFF";
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
  abstract connect(): void;
  abstract generate(data: GenerateData): void;
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
        this.handleICE(candidate);
      }
    };
    this.pc.ontrack = (event) => {
      console.log("Received track:", event.track);
      if (event.track.kind === "video") {
        this.video.srcObject = event.streams[0];
        this.video.play().catch((err) => {
          console.error("Error auto-playing video: ", err);
        });
      }
    };
    this.pc.ondatachannel = (event) => {
      console.log("Received data channel:", event);
    };
  }
  protected abstract handleICE(candidate: RTCIceCandidateInit): void;
}

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
      this.session
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
    if (!data.background_color) {
      data.background_color = this.backgroundColor;
    }
    await generate(this.session!, data);
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

/*
let lastBytesReceived = 0;
let videoIsPlaying = false; 
peerConnection.ontrack = (event) => {

    setInterval(async () => {
      const stats = await peerConnection.getStats(event.track);
    
      stats.forEach((report) => { 
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          
          const hasNewData = report.bytesReceived > lastBytesReceived; 
          const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;
          
          if (hasNewData && mediaElementRef.current) {
            if (videoStatusChanged) {
              videoIsPlaying = report.bytesReceived > lastBytesReceived;
              console.log('Received track:', event.track);
              mediaElementRef.current.srcObject = event.streams[0];
              mediaElementRef.current.play().catch(err => {
                console.error("Error auto-playing video: ", err);
              });
            }
           
          }
          lastBytesReceived = report.bytesReceived;
        }
      });
    }, 500); 
  };*/