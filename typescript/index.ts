// ideas for station placement algorithm
// identify longest line as trunk that's linear
// identify lines that share few stations with the trunk,
// these can be perpendicular to it
// identify stations with many lines, these are main interchange stations
// and should be evenly distributed around the 2d space
//
// as most lines share few stations the trunk, it implies the trunk
// should be bended, and the "fast" lines that skip stations along the trunk
// should be straighter
//
// should also maintain the time dimension, which would be lost if stations had proper
// 2d coords
// perhaps top left corner is oldest, bottom right corner is newest
// equi-time lines perpendicular indicate same time, but different spatial variation
// but that would just result in a \ sloped line like before
//
// lines should be curvy, but that's hard to do when all stations are equally spaced apart
// adding some variation, like denser in the center, could work
//
// lines should also not cross each other significantly without sharing a stop in
// intersection
// or at least, not cross the main trunk without an intersection
import * as d3 from 'd3-shape'
import { Repo, LineData, Schema } from './types'
import { MULTIPLIER } from './constants'
import { render_table } from './table'

const RENDER_TABLE = false
// const curves = [
//   d3.curveCatmullRom.alpha(0.5),
//   d3.curveCardinal.tension(0.5),
//   d3.curveBumpY,
// ]

const SVGNS = 'http://www.w3.org/2000/svg'

function restructure_data(repos: Array<Repo>): Map<string, LineData> {
  const line_data = new Map() // given a lang, get the color
  for (let repo_idx = 0; repo_idx < repos.length; repo_idx++) {
    const repo = repos[repo_idx]
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
  }
  return line_data
}

// put the most frequent in the center, and add subsequent langs on the right and left, alternating
// (even on the center/right, odd on the left. zero is even and is the only even
// on the center)
function distribute_lines(
  sorted: Array<[string, LineData]>
): Array<[string, LineData]> {
  const distributed = []
  for (let i = 0; i < sorted.length; i++) {
    if (i % 2 === 0) {
      distributed.push(sorted[i])
    } else {
      distributed.unshift(sorted[i])
    }
  }
  return distributed
}

function y_pos(row_idx: number): number {
  return 20 + row_idx * 40
}

function x_pos(col_idx: number): number {
  // TODO: starts at end of labels
  return 230 + col_idx * 60
}

function setup_svg(n_stations: number, n_lines: number): HTMLElement {
  const svg = document.getElementById('svg') as HTMLElement
  // TODO: don't hardcode buffers
  svg.setAttribute('height', (y_pos(n_stations - 1) + 40).toString())
  svg.setAttribute('width', (x_pos(n_lines - 1) + 20).toString())
  return svg
}

function find_station_x_pos_idx(
  sorted: Array<[string, LineData]>,
  repo: Repo
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

function draw_label(svg: HTMLElement, repo: Repo, y: number) {
  const text = document.createElementNS(SVGNS, 'text')
  text.setAttribute('x', '10')
  text.setAttribute('y', (y - 5).toString())
  text.setAttribute('class', 'label')
  text.innerHTML = repo.name
  svg.appendChild(text)

  const line = document.createElementNS(SVGNS, 'path')
  const width = svg.getAttribute('width')
  line.setAttribute('d', `M 10 ${y} L ${width} ${y}`)
  line.setAttribute('class', 'gridline')
  svg.appendChild(line)
}

function draw_lines(
  svg: HTMLElement,
  sorted: Array<[string, LineData]>,
  station_xs: Array<number>,
  station_ys: Array<number>
) {
  // iterate through every station in order of plot (every line -> every station on line)
  // add station to a map, values are x coord
  // if station is already in the map, add an offset to the xcoord
  const coords: Map<number, number> = new Map()

  for (const [lang_name, data] of sorted) {
    const stations = data.repo_idxs
    if (stations.length <= 1) {
      continue
    }
    draw_line(svg, lang_name, data, station_xs, station_ys, coords)
  }
}

function draw_line(
  svg: HTMLElement,
  line: string,
  data: LineData,
  station_xs: Array<number>,
  station_ys: Array<number>,
  coords: Map<number, number>
) {
  const xy: Array<[number, number]> = []
  for (const station of data.repo_idxs) {
    const entry = coords.get(station)
    let offset = 0
    if (entry === undefined) {
    } else if (entry < 0) {
      offset = Math.abs(entry) + MULTIPLIER
    } else {
      offset = entry * -1 - MULTIPLIER
    }
    coords.set(station, offset)
    const x = station_xs[station] + offset
    const y = station_ys[station]
    xy.push([x, y])
  }

  const p = d3.line().curve(d3.curveCatmullRom.alpha(0.5))(xy)!
  const path = document.createElementNS(SVGNS, 'path')
  path.setAttribute('d', p.toString())
  path.setAttribute('stroke', data.color)
  path.setAttribute('class', 'line')
  const title = document.createElementNS(SVGNS, 'title')
  title.textContent = line
  path.appendChild(title)
  svg.appendChild(path)

  for (let i = 0; i < data.repo_idxs.length; i++) {
    draw_station(svg, xy[i][0], xy[i][1], data.repo_names[i], line, data.color)
  }
}

function draw_station(
  svg: HTMLElement,
  x: number,
  y: number,
  repo_name: string,
  line: string,
  line_color: string
) {
  const circle = document.createElementNS(SVGNS, 'circle')
  circle.setAttribute('cx', x.toString())
  circle.setAttribute('cy', y.toString())
  circle.setAttribute('r', '5')
  circle.setAttribute('stroke', line_color)
  circle.setAttribute('class', 'station')

  // TODO: hover will trigger on bounding box of line, not on line itself
  const title = document.createElementNS(SVGNS, 'title')
  title.textContent = `${line} - ${repo_name}`
  circle.appendChild(title)

  svg.appendChild(circle)
}

fetch('./new.json')
  .then((response) => response.json())
  .then((j: Schema) => {
    const repos = j.data.user.repositories.nodes.filter(
      (repo) => repo.languages.edges.length > 0
    )
    const line_data = restructure_data(repos)
    const n_stations = repos.length
    const n_lines = line_data.size

    const sorted = Array.from(line_data)
      .filter((x) => x[1].count > 1)
      .sort(([_, a], [__, b]) => b.count - a.count)
    const distributed = distribute_lines(sorted)

    const svg = setup_svg(n_stations, n_lines)

    const station_xs = []
    const station_ys = []

    for (let row_idx = 0; row_idx < repos.length; row_idx++) {
      const repo = repos[row_idx]

      const station_col_idx = find_station_x_pos_idx(sorted, repo)!
      station_xs.push(x_pos(station_col_idx))

      const y = y_pos(row_idx)
      station_ys.push(y)
      draw_label(svg, repo, y)
    }

    draw_vertical_gridlines(svg, n_lines)

    draw_lines(svg, sorted, station_xs, station_ys)

    if (RENDER_TABLE) {
      render_table(distributed, repos)
    }
  })

function draw_vertical_gridlines(svg: HTMLElement, n_lines: number) {
  const height = svg.getAttribute('height')
  for (let i = 0; i < n_lines; i++) {
    const line = document.createElementNS(SVGNS, 'path')
    const x = x_pos(i)
    line.setAttribute('d', `M ${x},0 L ${x},${height}`)
    line.setAttribute('class', 'gridline')
    svg.appendChild(line)
  }
}
