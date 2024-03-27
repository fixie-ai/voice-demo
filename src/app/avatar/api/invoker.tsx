import { HttpException } from "./base";

export class Invoker {
  constructor(
    private base_url: string,
    private token?: string,
    private api_key?: string,
  ) {
    if (!!token == !!api_key) {
      throw new Error("Must set either token or api_key");
    }
  }
  async invoke(method: string, path: string, data?: any) {
    const url = `${this.base_url}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers.Authorization = `Basic ${this.token}`;
    }
    if (this.api_key) {
      headers["X-Api-Key"] = this.api_key;
    }
    const resp = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(data),
    });
    if (!resp.ok) {
      console.error(method, url, resp.status, resp.statusText);
      throw new HttpException(resp);
    }
    return await resp.json();
  }
  async get(path: string) {
    return this.invoke("GET", path);
  }
  async post(path: string, data?: any) {
    return this.invoke("POST", path, data);
  }
  async delete(path: string, data?: any) {
    return this.invoke("DELETE", path, data);
  }
}
