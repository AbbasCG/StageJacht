import { metGebruiker, ok } from "@/lib/api";
import { disconnectGmail } from "@/lib/gmail";

export const POST = metGebruiker(async (_req, { user }) => {
  await disconnectGmail(user.id);
  return ok();
});
