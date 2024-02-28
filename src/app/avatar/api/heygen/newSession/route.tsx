import { doPost } from "../helper";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json()
  return doPost('/v1/streaming.new', body);
}
