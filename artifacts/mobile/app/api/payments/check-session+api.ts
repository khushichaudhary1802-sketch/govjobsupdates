import { type ExpoRequest } from "expo-router/server";

export async function GET(request: ExpoRequest) {
  try {
    const url = new URL(request.url);
    const backendUrl = `http://localhost:8080/api/payments/check-session${url.search}`;
    const resp = await fetch(backendUrl);
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
