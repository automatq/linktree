/** Validate webhook URL is a public HTTPS endpoint (blocks SSRF) */
function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();

    // Block loopback
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host === "[::1]") return false;

    // Block private IPv4 ranges
    if (host.startsWith("10.")) return false;
    if (host.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

    // Block link-local, multicast, reserved
    if (host.startsWith("169.254.")) return false;
    if (/^(22[4-9]|23\d|24\d|25[0-5])\./.test(host)) return false; // 224.0.0.0/4 + 240.0.0.0/4

    // Block internal/local hostnames and IPv6 private prefixes
    if (host.endsWith(".internal") || host.endsWith(".local") || host.endsWith(".localhost")) return false;
    if (host.startsWith("fd") || host.startsWith("fe80")) return false; // IPv6 ULA + link-local
    if (host.startsWith("[fd") || host.startsWith("[fe80")) return false;

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
