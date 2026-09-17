import { getClaudeUsage } from '@/lib/claude'

export const dynamic = 'force-dynamic'

export async function GET() {
  const usage = await getClaudeUsage()
  return Response.json({ usage, error: usage ? null : 'failed' })
}