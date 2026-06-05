import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminSession";
import {
  blockIp,
  unblockIp,
  whitelistIp,
  removeFromWhitelist,
  dismissFlag,
} from "@/lib/server/rate-limit-tracker";

export const dynamic = "force-dynamic";

type Action = "block" | "unblock" | "whitelist" | "remove-whitelist" | "dismiss-flag";

export async function PATCH(
  req: Request,
  { params }: { params: { ip: string } },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = decodeURIComponent(params.ip);
  if (!ip || ip === "unknown") {
    return NextResponse.json({ error: "Invalid IP" }, { status: 400 });
  }

  let body: { action?: Action };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  switch (body.action) {
    case "block":            await blockIp(ip);             break;
    case "unblock":          await unblockIp(ip);           break;
    case "whitelist":        await whitelistIp(ip);         break;
    case "remove-whitelist": await removeFromWhitelist(ip); break;
    case "dismiss-flag":     await dismissFlag(ip);         break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
