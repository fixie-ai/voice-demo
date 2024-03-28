export class Proxy {
  private baseUrl;
  private token?;
  private apiKey?;
  constructor({
    baseUrl,
    token,
    apiKey,
  }: {
    baseUrl: string;
    token?: string;
    apiKey?: string;
  }) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.apiKey = apiKey;
  }
  async proxy(req: Request, path: string[]): Promise<Response> {    
    const url = `${this.baseUrl}/${path.join("/")}`;
    const opts = { method: req.method, headers: new Headers(), body: await req.text() };    
    const contentType = req.headers.get("content-type");
    if (contentType) {
      opts.headers!.set("content-type", contentType);
    }
    if (this.token) {
      opts.headers!.set("authorization", `Basic ${this.token}`);
    }
    if (this.apiKey) {
      opts.headers!.set("x-api-key", this.apiKey);
    }    
    //if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    //  opts.body = await req.text();
    //  }

    try {
      console.log(url, opts);
      const apiResp = await fetch(url, opts);
      const text = await apiResp.text();
      return new Response(text, { status: apiResp.status });
    } catch (e) {
      console.error("Proxy request failed:", e);
      return new Response(JSON.stringify({ error: "Proxy request failed" }), { status: 500 });
    }
  }
}
