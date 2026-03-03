import crypto from "crypto";

interface CapiLeadEventData {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  regionCode?: string;
  contentName?: string;
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function sha256Phone(phone: string): string {
  // Strip all non-digit characters before hashing
  const digits = phone.replace(/\D/g, "");
  return crypto.createHash("sha256").update(digits).digest("hex");
}

function getPixelConfig(regionCode?: string): { pixelId: string; token: string } | null {
  const code = (regionCode || "AU").toUpperCase();
  const pixelId = code === "BD"
    ? process.env.FACEBOOK_PIXEL_ID_BD
    : process.env.FACEBOOK_PIXEL_ID_AU;
  const token = code === "BD"
    ? process.env.FACEBOOK_CONVERSIONS_API_TOKEN_BD
    : process.env.FACEBOOK_CONVERSIONS_API_TOKEN_AU;

  if (!pixelId || !token) return null;
  return { pixelId, token };
}

export async function sendCapiLeadEvent(data: CapiLeadEventData): Promise<void> {
  const config = getPixelConfig(data.regionCode);
  if (!config) {
    // CAPI not configured — skip silently
    return;
  }

  const { pixelId, token } = config;
  const eventTime = Math.floor(Date.now() / 1000);

  const userData: Record<string, any> = {
    em: [sha256(data.email)],
    country: ["au"],
  };
  if (data.phone) {
    userData.ph = [sha256Phone(data.phone)];
  }
  if (data.firstName) {
    userData.fn = [sha256(data.firstName)];
  }
  if (data.lastName) {
    userData.ln = [sha256(data.lastName)];
  }
  if (data.clientIp) {
    userData.client_ip_address = data.clientIp;
  }
  if (data.clientUserAgent) {
    userData.client_user_agent = data.clientUserAgent;
  }

  const customData: Record<string, any> = {
    currency: data.currency || "AUD",
  };
  if (data.contentName) {
    customData.content_name = data.contentName;
  }
  if (data.value && data.value > 0) {
    customData.value = data.value;
  }

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: eventTime,
        action_source: "website",
        ...(data.eventSourceUrl ? { event_source_url: data.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: customData,
      },
    ],
  };

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      console.warn(`[Meta CAPI] Lead event failed (${response.status}): ${body}`);
    } else {
      console.log(`[Meta CAPI] Lead event sent successfully for region ${data.regionCode || "AU"}`);
    }
  } catch (err) {
    console.warn("[Meta CAPI] Failed to send Lead event:", err);
  }
}
