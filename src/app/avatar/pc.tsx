
'use client';
import { property } from 'lodash';
import { SessionData, SessionResponse, GenerateData } from './types';

async function invoke(method: string, path: string, data: any) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (response.status !== 200) {
    console.error(response.status, 'Server error', response);
    throw new Error('Server error');
  } 
  return await response.json();
}

async function doPost(path: string, data: any) {
  return invoke('POST', path, data);
}

async function startSession(session: SessionData): Promise<SessionResponse>{
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
    private session: SessionData;
    private pc?: RTCPeerConnection;    
    constructor(video: HTMLVideoElement, provider: string, service?: string) {
        super();
        this.video = video;
        this.session = { provider, service };       
    }    
    get connected() {
        return this.pc?.connectionState === 'connected';
    }
    async connect() {
        if (this.pc) {
            console.error('Peer connection already exists');
            return;
        }        
        const {session_id, stream_id, ice_servers, sdp} = await startSession(this.session);
        this.session.session_id = session_id;
        this.session.stream_id = stream_id;
        this.createPeerConnection(ice_servers);        
        const localSdp = await this.signalServerToClient(sdp);        
        await handleSDP(this.session!, localSdp);
        console.log("Peer connection negotiation complete");
    }
    async generate(data: GenerateData) {
        if (!this.pc) {
            console.error('Peer connection does not exist');
            return;
        }
        await generate(this.session!, data);
    }
    async close() {
        if (!this.pc || this.pc.connectionState === 'closed') {
            return;
        }
        await stopSession(this.session);
        this.pc.close();                    
    }
    private createPeerConnection(iceServers: RTCIceServer[]) {
        this.pc = new RTCPeerConnection({ iceServers });
        this.pc.onconnectionstatechange = () => {            
            console.log(`ICE connection state changed to: ${this.pc!.iceConnectionState}`);
            if (this.pc!.connectionState === 'connected') {
                const ev = new CustomEvent("connected", { detail: true });
                this.dispatchEvent(ev);
            } else if (this.pc!.connectionState === 'disconnected') {
                const ev = new CustomEvent("connected", { detail: false });
                this.dispatchEvent(ev);
            }
        }
        this.pc.onicecandidate = ({ candidate }) => {
            console.log('Received ICE candidate:', candidate);
            if (candidate) {
                handleICE(this.session!, candidate);
            }
        }
        this.pc.ontrack = (event) => {
            console.log('Received track:', event.track);
            if (event.track.kind === 'video') {
                this.video.srcObject = event.streams[0];
                this.video.play().catch(err => {
                    console.error("Error auto-playing video: ", err);
                });
            }
        }
        this.pc.ondatachannel = (event) => {    
            console.log('Received data channel:', event);
        }
    }
    private async signalServerToClient(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
      await this.pc!.setRemoteDescription(offer);
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      return answer;
    }

    private async signalClientToServer(sendFunc: (sdp: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>) {
      const offer = await this.pc!.createOffer();
      await this.pc!.setLocalDescription(offer);
      const answer = await sendFunc(offer);
      await this.pc!.setRemoteDescription(answer);
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