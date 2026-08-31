import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.LOOPCLOSE_API_URL ?? "https://loopclose-api.vercel.app/api"
).replace(/\/$/, "");

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstream = new URL(`${BACKEND_URL}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));
  const headers = new Headers();
  for (const name of ["authorization", "content-type", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { message: "The LoopClose API is temporarily unavailable" },
      { status: 502 }
    );
  }
}

export const dynamic = "force-dynamic";
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
