import { authorizeUrl, isKakaoConnected } from "@/lib/kakao";

// 카카오 연결 상태 + 연결 URL 반환 (클라이언트가 해당 URL로 이동)
export async function GET() {
  return Response.json({
    connected: await isKakaoConnected(),
    url: authorizeUrl(),
  });
}
