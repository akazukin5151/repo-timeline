import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { main } from '../typescript/lib.js'
import { FALLBACK } from '../typescript/fallback.js'

// const LINEAR: boolean = false
// const RENDER_TABLE: boolean = false
// const CURVE: d3.CurveFactory | d3.CurveFactoryLineOnly =
//   d3.curveCatmullRom.alpha(0.5)
// // d3.curveCardinal.tension(0.5)
// // d3.curveBumpY

export default async function(request: VercelRequest, response: VercelResponse, should_render_table: boolean) {
  const username = request.query['username']
  const token = process.env['PAT_1']

  const content_type = should_render_table ? 'text/html' : 'image/svg+xml'

  // null or undefined
  if (username == null || token == null) {
    const svg = await main(FALLBACK, should_render_table)
    response.setHeader("Content-Type", content_type);
    response.send(svg);
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
    url: "https://api.github.com/graphql",
    method: "post",
    headers,
    data,
  })

  if (res.data.errors !== undefined) {
    console.log(res.data.errors)
  }

  const svg = await main(res.data, should_render_table)
  response.setHeader("Content-Type", content_type);
  response.send(svg);
}

