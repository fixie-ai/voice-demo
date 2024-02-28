import { doPost } from "../helper";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json()
  const streamId = body.stream_id;
  const postBody = {
    answer: body.answer,
    session_id: body.session_id,
  };
  
  return doPost(`/streams/${streamId}/sdp`, postBody);
}


