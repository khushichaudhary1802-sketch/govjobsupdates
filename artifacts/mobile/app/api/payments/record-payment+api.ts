import { type ExpoRequest } from "expo-router/server";

export async function POST(request: ExpoRequest) {
  try {
    const body = await request.json();
    const resp = await fetch("http://localhost:8080/api/payments/record-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return Response.json(data, { status: resp.status });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
