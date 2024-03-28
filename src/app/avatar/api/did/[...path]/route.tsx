// pages/api/[...proxy].ts
import { NextApiRequest, NextApiResponse } from "next";
import { Proxy } from "../../proxy";

const proxy = new Proxy({
  baseUrl: "https://api.d-id.com",
  token: process.env.DID_API_KEY,
});

export async function DELETE(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  return proxy.proxy(req, params.path);
}

export async function POST(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  return proxy.proxy(req, params.path);
}
