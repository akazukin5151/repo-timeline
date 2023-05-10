import type { VercelRequest, VercelResponse } from '@vercel/node'
import _common from './_common.js'

export default async function (
  request: VercelRequest,
  response: VercelResponse
) {
  return _common(request, response, { render_table: true, linear: false })
}
