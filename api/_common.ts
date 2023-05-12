import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import { main } from '../typescript/lib.js'
import { FALLBACK } from '../typescript/fallback.js'
import { Options } from '../typescript/types.js'

export default async function (
  request: VercelRequest,
  response: VercelResponse,
  options: Options,
) {
  const username = request.query['username']
  const token = process.env['PAT_1']

  const content_type = options.render_table ? 'text/html' : 'image/svg+xml'

  // null or undefined
  if (username == null || token == null) {
    const svg = await main(FALLBACK, options)
    response.setHeader('Content-Type', content_type)
    response.send(svg)
    return
  }

  const variables = { login: username }

  const data = {
    query: `
      query userInfo($login: String!) {
        user(login: $login) {
          repositories(
            ownerAffiliations: OWNER
            isFork: false
            first: 100
            privacy: PUBLIC
          ) {
            nodes {
              name
              createdAt
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `,
    variables,
  }

  const headers = {
    Authorization: `bearer ${token}`,
  }

  const res = await axios({
    url: 'https://api.github.com/graphql',
    method: 'post',
    headers,
    data,
  })

  if (res.data.errors !== undefined) {
    console.log(res.data.errors)
  }

  const svg = await main(res.data, options)
  response.setHeader('Content-Type', content_type)
  response.send(svg)
}
