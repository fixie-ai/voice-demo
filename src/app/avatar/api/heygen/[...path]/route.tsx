// pages/api/[...proxy].ts
import { Proxy } from "../../proxy";

const proxy = new Proxy({
  baseUrl: "https://api.heygen.com",
  apiKey: process.env.HEYGEN_API_KEY,
});

export async function POST(
  req: Request, { params }: { params: { path: string[] } 
}) {  
  return proxy.proxy(req, params.path);
}
