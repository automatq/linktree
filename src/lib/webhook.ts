/** Validate webhook URL is a public HTTPS endpoint (blocks SSRF) */
function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    // Block private/internal ranges
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("172.")) return false;
    if (host === "169.254.169.254") return false; // cloud metadata
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fireWebhook(
  webhookUrl: string | null | undefined,
  event: string,
  data: Record<string, unknown>
) {
  if (!webhookUrl) return;
  if (!isAllowedWebhookUrl(webhookUrl)) {
    console.error("Webhook blocked: URL failed SSRF validation", webhookUrl);
    return;
  }
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
  } catch (err) {
    console.error("Webhook delivery failed:", err);
  }
}
