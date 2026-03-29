import { type ExpoRequest } from "expo-router/server";

export async function GET(request: ExpoRequest) {
  try {
    const url = new URL(request.url);
    const backendUrl = `http://localhost:8080/api/payments/checkout-page${url.search}`;
    const resp = await fetch(backendUrl);
    const html = await resp.text();
    return new Response(html, {
      status: resp.status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(`<html><body>Error: ${err?.message}</body></html>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
