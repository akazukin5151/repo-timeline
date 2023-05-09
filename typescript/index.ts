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
import { Repo, RepoData, Schema } from './types'

const RENDER_TABLE = false

const SVGNS = 'http://www.w3.org/2000/svg'
const MULTIPLIER = 10

function collect_colors_and_count(repos: Array<Repo>): Map<string, RepoData> {
  const repo_data = new Map()
  for (const repo of repos) {
    for (const lang of repo.languages.edges) {
      const d = repo_data.get(lang.node.name)
      if (d) {
        d.count += 1
      } else {
        repo_data.set(lang.node.name, { color: lang.node.color, count: 1 })
      }
    }
  }
  return repo_data
}

// put the most frequent in the center, and add subsequent langs on the right and left, alternating
// (even on the center/right, odd on the left. zero is even and is the only even
// on the center)
function distribute_lines(
  sorted: Array<[string, RepoData]>
): Array<[string, RepoData]> {
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

function add_lang_cols(distributed: Array<[string, RepoData]>): void {
  const thead = document.getElementById('thead')!
  const row = document.createElement('tr')
  const th = document.createElement('th')
  row.appendChild(th)
  for (const [lang, data] of distributed) {
    const th = document.createElement('th')
    th.innerText = lang
    th.style.color = data.color
    row.appendChild(th)
  }
  {
    const th = document.createElement('th')
    th.innerText = 'sum'
    row.appendChild(th)
  }
  {
    const th = document.createElement('th')
    th.innerText = 'offsets'
    row.appendChild(th)
  }
  thead.appendChild(row)
}

function y_pos(row_idx: number): number {
  return 20 + row_idx * 40
}

function x_pos(col_idx: number): number {
  return 230 + col_idx * 60
}

function setup_svg(
  repos: Array<Repo>,
  distributed: Array<[string, RepoData]>
): HTMLElement {
  const svg = document.getElementById('svg') as HTMLElement
  svg.setAttribute('height', (y_pos(repos.length - 1) + 40).toString())
  svg.setAttribute('width', (x_pos(distributed.length - 1) + 20).toString())
  return svg
}

function add_repo_row(repo: Repo): HTMLTableRowElement {
  const row = document.createElement('tr')
  const td = document.createElement('td')
  td.innerText = repo.name
  row.appendChild(td)
  return row
}

function find_station_x_pos_idx(
  sorted: Array<[string, RepoData]>,
  distributed: Array<[string, RepoData]>,
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
  for (let i = 0; i < distributed.length; i++) {
    if (distributed[i] === sorted[sorted_idx]) {
      return i
    }
  }
  // const idx_of_zero = Math.ceil(sorted.length / 2)
  // if (sorted_idx % 2 === 0) {
  //   return idx_of_zero - (sorted_idx - 1)
  // }
  // idx_of_zero + (sorted_idx - 1)
  // // 0 1 2 3 4
  // // 0 1 2 3 4
  // // look for 3
  // // 2 is even, so start from 0 and go to the left by (2 - 1) = 1 position
  // // 3 is odd, so start from 0 and go to the right by (3 - 1) = 2 positions
  // // 3 1 0 2 4
  // //
  // // 5 3 1 0 2 4
  // return sorted_idx / 2
}

function draw_label(svg: HTMLElement, repo: Repo, y: number) {
  const text = document.createElementNS(SVGNS, 'text')
  text.setAttribute('x', '10')
  text.setAttribute('y', (y - 5).toString())
  text.setAttribute('font-size', '12')
  text.setAttribute('font-family', 'sans-serif')
  text.innerHTML = repo.name
  svg.appendChild(text)

  const line = document.createElementNS(SVGNS, 'path')
  const width = svg.getAttribute('width')
  line.setAttribute('d', `M 10 ${y} L ${width} ${y}`)
  line.setAttribute('stroke', '#cccccc')
  svg.appendChild(line)
}

function add_cols_for_row(
  distributed: Array<[string, RepoData]>,
  repo: Repo,
  row: HTMLTableRowElement
) {
  let count = 0
  for (let col_idx = 0; col_idx < distributed.length; col_idx++) {
    const [lang_col, data] = distributed[col_idx]
    const td = document.createElement('td')

    for (const repo_lang of repo.languages.edges) {
      if (repo_lang.node.name === lang_col) {
        count += 1
        td.innerText = 'x'
        td.style.color = data.color
        break
      }
    }
    row.appendChild(td)
  }
  {
    const td = document.createElement('td')
    td.innerText = count.toString()
    row.appendChild(td)
  }
  {
    const td = document.createElement('td')
    let text = ''
    for (let i = 0; i < count; i++) {
      const offset = calc_offset(i)
      text += offset.toString() + ', '
    }
    td.innerText = text
    row.appendChild(td)
  }
}

function calc_stations_by_line(
  repos: Array<Repo>,
  distributed: Array<[string, RepoData]>
): Map<string, Array<number>> {
  const stations_by_line = new Map()
  // for every line
  for (const [lang_name, _] of distributed) {
    for (let repo_idx = 0; repo_idx < repos.length; repo_idx++) {
      const repo = repos[repo_idx]
      for (const lang of repo.languages.edges) {
        // if station is on line
        if (lang.node.name === lang_name) {
          // const e = coords.get(repo_idx)
          // if (e === undefined) {
          //   coords.set(repo_idx, [0])
          // }

          const entry = stations_by_line.get(lang_name)
          if (entry) {
            entry.push(repo_idx)
          } else {
            stations_by_line.set(lang_name, [repo_idx])
          }
        }
      }
    }
  }
  return stations_by_line
}

// offset a station's position, if there are already n stations on the row
// only used for table
function calc_offset(nth_station: number): number {
  if (nth_station % 2 === 0) {
    return nth_station * MULTIPLIER
  }
  return -nth_station * MULTIPLIER
}

function draw_lines(
  svg: HTMLElement,
  stations_by_line: Map<string, Array<number>>,
  repos: Array<Repo>,
  repo_data: Map<string, RepoData>,
  station_xs: Array<number>,
  station_ys: Array<number>
) {
  // iterate through every station in order of plot (every line -> every station on line)
  // add station to a map, values are x coord
  // if station is already in the map, add an offset to the xcoord
  const coords: Map<number, number> = new Map()

  for (const [line, stations] of stations_by_line) {
    if (stations.length <= 1) {
      continue
    }
    const line_color = repo_data.get(line)!.color
    draw_line(
      svg,
      line_color,
      line,
      stations,
      station_xs,
      station_ys,
      coords,
      repos
    )
  }
}

function draw_line(
  svg: HTMLElement,
  line_color: string,
  line: string,
  stations: Array<number>,
  station_xs: Array<number>,
  station_ys: Array<number>,
  coords: Map<number, number>,
  repos: Array<Repo>
) {
  const data: Array<[number, number]> = []
  for (const station of stations) {
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
    data.push([x, y])
  }

  // const curves = [
  //   d3.curveCatmullRom.alpha(0.5),
  //   d3.curveCardinal.tension(0.5),
  //   d3.curveBumpY,
  // ]
  const p = d3.line().curve(d3.curveCatmullRom.alpha(0.5))(data)!
  const path = document.createElementNS(SVGNS, 'path')
  path.setAttribute('d', p.toString())
  path.setAttribute('stroke', line_color)
  path.setAttribute('stroke-width', '5')
  path.setAttribute('fill', 'transparent')
  const title = document.createElementNS(SVGNS, 'title')
  title.textContent = line
  path.appendChild(title)
  svg.appendChild(path)

  for (let i = 0; i < stations.length; i++) {
    draw_station(
      svg,
      data[i][0],
      data[i][1],
      repos[stations[i]],
      line,
      line_color
    )
  }
}

function draw_station(
  svg: HTMLElement,
  x: number,
  y: number,
  repo: Repo,
  line: string,
  line_color: string
) {
  const circle = document.createElementNS(SVGNS, 'circle')
  circle.setAttribute('cx', x.toString())
  circle.setAttribute('cy', y.toString())
  circle.setAttribute('r', '5')
  circle.setAttribute('stroke', line_color)
  circle.setAttribute('stroke-width', '2')
  circle.setAttribute('fill', 'white')

  const title = document.createElementNS(SVGNS, 'title')
  title.textContent = `${line} - ${repo.name}`
  circle.appendChild(title)

  svg.appendChild(circle)
}

fetch('./new.json')
  .then((response) => response.json())
  .then((j: Schema) => {
    const tbody = document.getElementById('tbody')!
    const repos = j.data.user.repositories.nodes.filter(
      (repo) => repo.languages.edges.length > 0
    )
    const repo_data = collect_colors_and_count(repos)

    const sorted = Array.from(repo_data)
      .filter((x) => x[1].count > 1)
      .sort(([_, a], [__, b]) => b.count - a.count)
    const distributed = distribute_lines(sorted)

    if (RENDER_TABLE) {
      add_lang_cols(distributed)
    }

    const svg = setup_svg(repos, distributed)

    const station_xs = []
    const station_ys = []

    // add repos rows and indicate their languages in the columns
    for (let row_idx = 0; row_idx < repos.length; row_idx++) {
      const repo = repos[row_idx]

      const station_col_idx = find_station_x_pos_idx(
        sorted,
        distributed,
        repo
      )!
      station_xs.push(x_pos(station_col_idx))

      const y = y_pos(row_idx)
      station_ys.push(y)
      draw_label(svg, repo, y)

      if (RENDER_TABLE) {
        const row = add_repo_row(repo)
        add_cols_for_row(distributed, repo, row)
        tbody.appendChild(row)
      }
    }

    const stations_by_line = calc_stations_by_line(repos, distributed)

    const height = svg.getAttribute('height')

    for (let i = 0; i < distributed.length; i++) {
      const line = document.createElementNS(SVGNS, 'path')
      const x = x_pos(i)
      line.setAttribute('d', `M ${x},0 L ${x},${height}`)
      line.setAttribute('stroke', '#ccc')
      svg.appendChild(line)
    }

    draw_lines(svg, stations_by_line, repos, repo_data, station_xs, station_ys)

  })
