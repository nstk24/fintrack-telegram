
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          application: "FinTrack",
          version: "1.0.0",
          status: "running",
          message: "FinTrack API is working!"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString()
      });
    }

    return Response.json(
      { error: "Route not found" },
      { status: 404 }
    );
  }
};
