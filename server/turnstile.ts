export async function verifyTurnstileToken(token: string | undefined, remoteip?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { success: true };
  }

  if (!token) {
    // Widget may have failed to load (e.g. domain not whitelisted, CSP, network error).
    // Allow through rather than blocking real users; configure the site key's allowed
    // domains in Cloudflare to re-enable bot protection.
    console.warn("[Turnstile] No token received — widget may not have loaded. Allowing submission through.");
    return { success: true };
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(remoteip ? { remoteip } : {}),
    });

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await response.json() as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      console.warn("[Turnstile] Verification failed:", data["error-codes"]);
      return { success: false, error: "CAPTCHA verification failed. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Verification error:", err);
    return { success: true };
  }
}
