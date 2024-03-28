export async function invoke(method: string, path: string, data: any) {
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

function throwIfNotOk(response: Response) {
  if (!response.ok) {
    throw new Error("Server error");
  }
}

export async function doPost(path: string, data: any) {
  const response = await invoke("POST", path, data);
  throwIfNotOk(response);
  return await response.json();
}

export async function doDelete(path: string, data: any) {
  const response = await invoke("POST", path, data);
  throwIfNotOk(response);
  return await response.json();
}
