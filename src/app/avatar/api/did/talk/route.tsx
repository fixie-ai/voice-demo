import { doPost } from "../helper";

export async function POST(req: Request): Promise<Response> {
  const service = process.env.DID_SERVICE || '';
  const body = await req.json()
  const streamId = body.stream_id;
  const postBody = {
    script: {
      type: 'audio', 
      audio_url: body.audio_url, //hardcoded for now
    }, 
    ...(service === 'clips' && {
      background: {
        color: '#FFFFFF',
      },
    }),
    config: {
      stitch: true,
    },
    session_id: body.session_id,
  };
  console.log('POST', postBody, streamId)
  return doPost(`/streams/${streamId}`, postBody);
}


