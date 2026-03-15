export async function GET(): Promise<Response> {
  return Response.json({
    status: "ok",
    message: "create-json-cms starter is running",
  });
}
