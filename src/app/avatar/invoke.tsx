export async function invoke(method: string, path: string, data: any) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    console.error(response.status, "Server error", response);
    throw new Error("Server error");
  }
  return await response.json();
}

export async function doPost(path: string, data: any) {
  return invoke("POST", path, data);
}

export async function doDelete(path: string, data: any) {
  return invoke("DELETE", path, data);
}
