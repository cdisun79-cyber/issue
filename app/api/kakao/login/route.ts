import { requireUser, unauthorized } from "@/lib/auth";
import { authorizeUrl, isKakaoConnected } from "@/lib/kakao";

// 카카오 연결 상태 + 연결 URL 반환 (클라이언트가 해당 URL로 이동)
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  return Response.json({
    connected: await isKakaoConnected(user.id),
    url: authorizeUrl(user.id),
  });
}
