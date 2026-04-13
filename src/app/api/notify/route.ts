// =============================================================
// FILE: src/app/api/notify/route.ts
// PURPOSE: Server-side API endpoint. The dashboard calls this
//          to trigger emails without exposing the API key.
//
// Called automatically by the dashboard — you don't touch this.
// =============================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  notifyProjectCreated,
  notifyProjectUpdated,
  notifyCommentAdded,
} from '@/lib/notify'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, projectName, actor, extra } = body

    if (!type || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields: type, projectName' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'project_created':
        await notifyProjectCreated(projectName, extra?.owner || '—', actor)
        break

      case 'project_updated':
        await notifyProjectUpdated(projectName, actor, extra?.changes || 'Details changed')
        break

      case 'comment_added':
        await notifyCommentAdded(projectName, actor, extra?.text || '')
        break

      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/notify] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
