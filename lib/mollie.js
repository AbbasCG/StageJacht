import createMollieClient from "@mollie/api-client";

let client;
export function mollie() {
  if (!client) client = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
  return client;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function plusMaand(datum = new Date(), extraDagen = 0) {
  const d = new Date(datum);
  d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() + extraDagen);
  return d;
}

export function checkoutUrl(payment) {
  if (typeof payment.getCheckoutUrl === "function") return payment.getCheckoutUrl();
  return payment._links?.checkout?.href;
}
