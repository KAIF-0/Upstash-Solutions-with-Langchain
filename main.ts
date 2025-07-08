import { serve } from "bun";

const server = serve({
  port: 8000,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    let response = await request.body;

    if (pathname == "/api") {
      console.log(response);
    }

    return new Response("Hello", {
      status: 200,
    });
  },
  error(error: Error) {
    return new Response("Something Went Wrong: " + error.message, {
      status: 500,
    });
  },
});
