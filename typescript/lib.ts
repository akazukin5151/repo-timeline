import * as d3 from 'd3-shape'
import { Repo, LineData, Schema, Options, NamedPoint } from './types.js'
import { MULTIPLIER } from './constants.js'
import { render_table } from './table.js'
import { improve_lines } from './improve.js'

const CURVE: d3.CurveFactory | d3.CurveFactoryLineOnly =
  d3.curveCatmullRom.alpha(0.5)
d3.curveCardinal.tension(0.5)
d3.curveBumpY

function restructure_data(
  repos: ReadonlyArray<Repo>,
): ReadonlyMap<string, LineData> {
  const line_data = new Map()
  repos.forEach((repo, repo_idx) => {
    for (const lang of repo.languages.edges) {
      const lang_name = lang.node.name
      const entry = line_data.get(lang_name)
      if (entry) {
        entry.count += 1
        entry.repo_idxs.push(repo_idx)
        entry.repo_names.push(repo.name)
      } else {
        line_data.set(lang_name, {
          color: lang.node.color,
          count: 1,
          repo_idxs: [repo_idx],
          repo_names: [repo.name],
        })
      }
    }
  })
  return line_data
}

// put the most frequent in the center, and add subsequent langs on the right and left, alternating
// (even on the center/right, odd on the left. zero is even and is the only even
// on the center)
function distribute_lines(
  sorted: ReadonlyArray<[string, LineData]>,
): ReadonlyArray<[string, LineData]> {
  const distributed: Array<[string, LineData]> = []
  sorted.forEach((item, i) => {
    if (i % 2 === 0) {
      distributed.push(item)
    } else {
      distributed.unshift(item)
    }
  })
  return distributed
}

function y_pos(row_idx: number): number {
  return 20 + row_idx * 40
}

function x_pos(col_idx: number): number {
  // TODO: starts at end of labels
  return 230 + col_idx * 60
}

function build_svg(width: number, height: number, body: string): string {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .label {
        font-size: 12px;
        font-family: sans-serif;
      }
      .gridline {
        stroke: #cccccc;
      }
      .line {
        stroke-width: 5;
        fill: none;
      }
      .station {
        stroke-width: 2;
        fill: white;
      }
    </style>
    ${body}
  </svg>
  `
}

function find_station_x_pos_idx(
  sorted: ReadonlyArray<[string, LineData]>,
  repo: Repo,
): number | undefined {
  // find the most frequent repo for this station
  const sorted_idx = sorted.findIndex(([lang_name, _]) => {
    for (const repo_lang of repo.languages.edges) {
      if (repo_lang.node.name === lang_name) {
        return true
      }
    }
    return false
  })

  // find that repo's corresponding position when the repos were distributed
  // all even numbers are on the right of zero
  // with a magnitude of sorted_idx / 2
  // all odd numbers are on the left of zero
  // with a magnitude of ceil(sorted_idx / 2)
  const idx_of_zero = Math.floor(sorted.length / 2)
  if (sorted_idx % 2 === 0) {
    return idx_of_zero + sorted_idx / 2
  }
  return idx_of_zero - Math.ceil(sorted_idx / 2)
}

function draw_label(width: number, repo: Repo, y: number): [string, string] {
  const title_text = repo.languages.edges
    .map((lang) => lang.node.name)
    .join('\n')
  const title = `<title>${title_text}</title>`
  const t = `<text x="10" y="${y - 5}" class="label">${
    repo.name
  }${title}</text>`
  const l = `<path d="M 10 ${y} L ${width} ${y}" class="gridline"></path>`
  return [t, l]
}

function draw_lines(
  all_stations: Map<string, Array<NamedPoint>>,
  sorted: ReadonlyArray<[string, LineData]>,
): string {
  let res = ''
  for (const [lang_name, data] of sorted) {
    const stations = data.repo_idxs
    if (stations.length <= 1) {
      continue
    }
    res += draw_line(all_stations.get(lang_name)!, lang_name, data)
  }
  return res
}

function calc_all_stations(
  options: Options,
  sorted: ReadonlyArray<[string, LineData]>,
  station_xs: ReadonlyArray<[string, number]>,
  station_ys: ReadonlyArray<[string, number]>,
): Map<string, Array<NamedPoint>> {
  // iterate through every station in order of plot (every line -> every station on line)
  // add station to a map, values are x coord
  // if station is already in the map, add an offset to the xcoord
  const coords: Map<number, number> = new Map()

  let i = 0
  const res = new Map()
  for (const [lang_name, data] of sorted) {
    const stations = data.repo_idxs
    if (stations.length <= 1) {
      continue
    }
    res.set(
      lang_name,
      calc_stations_on_line(options, data, station_xs, station_ys, coords, i),
    )
    i += 1
  }
  return res
}

function calc_offset(entry: number | undefined): number {
  if (entry === undefined) {
    return 0
  } else if (entry < 0) {
    return Math.abs(entry) + MULTIPLIER
  } else {
    return entry * -1 - MULTIPLIER
  }
}

function calc_stations_on_line(
  options: Options,
  data: LineData,
  station_xs: ReadonlyArray<[string, number]>,
  station_ys: ReadonlyArray<[string, number]>,
  coords: Map<number, number>,
  i: number,
): Array<NamedPoint> {
  const xy: Array<NamedPoint> = []
  for (const station of data.repo_idxs) {
    const entry = coords.get(station)
    const offset = calc_offset(entry)
    coords.set(station, offset)
    const x = options.linear ? x_pos(i) : station_xs[station]![1] + offset
    const y = station_ys[station]![1]
    const name = station_xs[station]![0]
    xy.push([name, x, y])
  }
  return xy
}

function draw_line(
  xy: Array<NamedPoint>,
  line: string,
  data: LineData,
): string {
  const t = `<title>${line}</title>`

  const d = d3.line().curve(CURVE)(xy.map((x) => [x[1], x[2]]))!
  const p = `<path d="${d}" stroke="${data.color}" class="line">${t}</path>`

  const stations_body = data.repo_idxs.map((_, i) =>
    draw_station(xy[i]![1], xy[i]![2], data.repo_names[i]!, line, data.color),
  )
  return p.concat(...stations_body)
}

function draw_station(
  x: number,
  y: number,
  repo_name: string,
  line: string,
  line_color: string,
): string {
  // TODO: hover will trigger on bounding box of line, not on line itself
  const t = `<title>${line} - ${repo_name}</title>`
  const c = `<circle cx="${x}" cy="${y}" r="5" stroke="${line_color}" class="station">${t}</circle>`
  return c
}

export async function main(j: Schema, options: Options): Promise<string> {
  const repos = j.data.user.repositories.nodes.filter(
    (repo) => repo.languages.edges.length > 0,
  )
  const line_data = restructure_data(repos)
  const n_stations = repos.length
  const n_lines = line_data.size

  const sorted = Array.from(line_data)
    .filter((x) => x[1].count > 1)
    .sort(([_, a], [__, b]) => b.count - a.count)
  const distributed = distribute_lines(sorted)

  let body = ''
  const height = y_pos(n_stations - 1) + 40
  const width = x_pos(n_lines - 1) + 20

  const station_xs: Array<[string, number]> = []
  const station_ys: Array<[string, number]> = []

  repos.forEach((repo, row_idx) => {
    const station_col_idx = find_station_x_pos_idx(sorted, repo!)!
    station_xs.push([repo.name, x_pos(station_col_idx)])

    const y = y_pos(row_idx)
    station_ys.push([repo.name, y])
    body = body.concat(...draw_label(width, repo!, y))
  })

  body = body.concat(...draw_vertical_gridlines(height, n_lines))

  const all_stations = calc_all_stations(
    options,
    options.linear ? distributed : sorted,
    station_xs,
    station_ys,
  )

  improve_lines(all_stations, repos, sorted[0]![0]!)

  body += draw_lines(all_stations, options.linear ? distributed : sorted)

  if (options.render_table) {
    return render_table(distributed, repos)
  }
  return build_svg(width, height, body)
}

function draw_vertical_gridlines(
  height: number,
  n_lines: number,
): Array<string> {
  const res = []
  for (let i = 0; i < n_lines; i++) {
    const x = x_pos(i)
    const l = `<path d="M ${x},0 L ${x},${height}" class="gridline"></path>`
    res.push(l)
  }
  return res
}
