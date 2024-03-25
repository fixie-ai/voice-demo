import { handlePost } from "../handler";

export async function POST(req: Request): Promise<Response> {
  return handlePost("sdp", req);
}


