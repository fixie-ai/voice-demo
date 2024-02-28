import { doPost } from "../helper";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json()
  console.log('POST', body)
  const streamId = body.stream_id;
  const postBody = {
    candidate: body.candidate,
    sdpMid: body.sdpMid,
    sdpMLineIndex: body.sdpMLineIndex,
    session_id: body.session_id,
  };

  console.log('sessionid', body.session_id)
  console.log('streamid', body.stream_id)
  return doPost(`/streams/${streamId}/ice`, postBody);
}


