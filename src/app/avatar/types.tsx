export interface SessionData {
    provider: string;
    service?: string;
    session_id?: string;
    stream_id?: string;
}
  
export interface SessionResponse {
    session_id: string;
    stream_id?: string;
    ice_servers: RTCIceServer[];
    sdp: RTCSessionDescriptionInit; 
}
  
export interface GenerateData {
    text?: string;
    audio_url?: string;
}