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

export interface TextInput {
  text: string;
}

export interface AudioInput {
  url: string;
}

export interface GenerateData {
  text?: TextInput;
  audio?: AudioInput;
  background_color?: string;
}
