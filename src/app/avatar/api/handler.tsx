import { HttpException, ServiceHandler } from "./base";
import { DIDClipsHandler, DIDTalksHandler } from "./did";
import { HeyGenHandler } from "./heygen";

const SERVICE_MAP: Record<string, ServiceHandler> = {
  "did:talks": new DIDTalksHandler(),
  "did:clips": new DIDClipsHandler(),
  "heygen:default": new HeyGenHandler(),
};

export async function handlePost(
  method: string,
  req: Request,
): Promise<Response> {
  const body = await req.json();
  const session = body.session;
  const key = `${session.provider}:${session.service ?? "default"}`;
  if (!(key in SERVICE_MAP)) {
    return new Response("Invalid provider or service", { status: 400 });
  }
  const handler = SERVICE_MAP[key];
  let response = {};
  try {
    switch (method) {
      case "start":
        response = await handler.start();
        break;
      case "stop":
        await handler.stop(session);
        break;
      case "sdp":
        await handler.sdp(session, body.sdp);
        break;
      case "ice":
        await handler.ice(session, body.candidate);
        break;
      case "generate":
        await handler.generate(session, body.data);
        break;
      default:
        return new Response("Invalid method", { status: 400 });
    }
  } catch (e) {
    if (e instanceof HttpException) {
      return new Response(e.response.body, { status: e.response.status });
    }
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
  return new Response(JSON.stringify(response));
}
