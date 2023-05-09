import { MULTIPLIER } from "./constants"
import { Repo, RepoData } from "./types"

export function render_table(distributed: Array<[string, RepoData]>, repos: Array<Repo>) {
  const tbody = document.getElementById('tbody')!
  add_lang_cols(distributed)
  for (const repo of repos) {
    // add repos rows and indicate their languages in the columns
    const row = add_repo_row(repo)
    add_cols_for_row(distributed, repo, row)
    tbody.appendChild(row)
  }
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

function add_repo_row(repo: Repo): HTMLTableRowElement {
  const row = document.createElement('tr')
  const td = document.createElement('td')
  td.innerText = repo.name
  row.appendChild(td)
  return row
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

// offset a station's position, if there are already n stations on the row
// only used for table
function calc_offset(nth_station: number): number {
  if (nth_station % 2 === 0) {
    return nth_station * MULTIPLIER
  }
  return -nth_station * MULTIPLIER
}

