import { exchangeCode, verifyState } from "@/lib/kakao";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = verifyState(url.searchParams.get("state"));
  const code = url.searchParams.get("code");
  const home = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!userId || !code) return Response.redirect(`${home}/?kakao=fail`);
  try {
    await exchangeCode(userId, code);
    return Response.redirect(`${home}/?kakao=ok`);
  } catch {
    return Response.redirect(`${home}/?kakao=fail`);
  }
}
