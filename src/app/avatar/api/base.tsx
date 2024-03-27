import { SessionData, SessionResponse, GenerateData } from "../types";

export class HttpException extends Error {
  response: Response;
  constructor(response: Response) {
    super(`${response.status} ${response.statusText}`);
    this.response = response;
  }
}

export abstract class ServiceHandler {
  abstract start(): Promise<SessionResponse>;
  abstract stop(session: SessionData): Promise<void>;
  abstract sdp(
    session: SessionData,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void>;
  abstract ice(
    session: SessionData,
    candidate: RTCIceCandidateInit,
  ): Promise<void>;
  abstract generate(session: SessionData, data: GenerateData): Promise<void>;
}
