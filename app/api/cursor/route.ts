import { getCursorUsage } from '@/lib/cursor'

export const dynamic = 'force-dynamic'

export async function GET() {
  const usage = await getCursorUsage()
  return Response.json({ usage, error: usage ? null : 'failed' })
}