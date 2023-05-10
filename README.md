# repo-timeline

Generate a metro map from your repositories on GitHub

## Usage

There are two routes, `/api` and `/api/table`

### SVG metro map

- `username`: the username of the GitHub user. If missing, defaults to `akazukin5151`
- `linear`: whether the "map" should just be a linear chain of stations. Looks like the table with connected lines. Only a value of `true` will enable this (ie, not `True` or `1`)

**Examples:**

`http://repo-timeline-five.vercel.app/api?username=akazukin5151`

`http://repo-timeline-five.vercel.app/api?username=anuraghazra`

### HTML table (for debugging)

- `username`: the username of the GitHub user. If missing, defaults to `akazukin5151`

**Examples:**

`http://repo-timeline-five.vercel.app/api?username=akazukin5151`

`http://repo-timeline-five.vercel.app/api/table?username=anuraghazra`

## Run locally

0. Generate a GitHub personal access token (PAT)
1. Git clone
2. In repo root, create a `.env` with the key `PAT_1=YOUR_PAT`
3. `npm ci`
4. `npx vercel dev`
5. Navigate to the link it gives (eg, `localhost:3000`). This is the domain root, so all links will become `localhost:3000/api?username=xxx`, and so on

Additionally, you can edit the code and reload the page - the vercel CLI will handle Typescript compilation by itself.

## Credits

Anurag Hazra for the fantastic [github-readme-stats](https://github.com/anuraghazra/github-readme-stats), which was the initial inspiration for me. I [forked](https://github.com/akazukin5151/github-readme-stats) and modified it to draw the programming language usage in my entire repository history. This is just a culmination of that.

## License

AGPL v3 or later
