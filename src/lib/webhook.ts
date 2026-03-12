export async function fireWebhook(
  webhookUrl: string | null | undefined,
  event: string,
  data: Record<string, unknown>
) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data,
      }),
    });
  } catch {
    // Silently fail — webhook errors never block the main request
  }
}
