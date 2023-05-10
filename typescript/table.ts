import { MULTIPLIER } from './constants.js'
import { Repo, LineData } from './types.js'

export function render_table(
  distributed: ReadonlyArray<[string, LineData]>,
  repos: ReadonlyArray<Repo>
) {
  const thead = add_lang_cols(distributed)
  let body = ''
  for (const repo of repos) {
    // add repos rows and indicate their languages in the columns
    let row = `<td>${repo.name}</td>`
    row += add_cols_for_row(distributed, repo)
    body += `<tr>${row}</tr>`
  }

  return `
<!DOCTYPE html>
<head> </head>

<style>
  * {
    font-family: sans-serif;
  }
</style>

<body>
  <table>
    ${thead}
    <tbody id="tbody">${body}</tbody>
</body>
  `
}

function add_lang_cols(distributed: ReadonlyArray<[string, LineData]>): string {
  let res = ''
  res += '<th></th>'
  for (const [lang, data] of distributed) {
    res += `<th style="color: ${data.color}">${lang}</th>`
  }
  res += '<th>sum</th>'
  res += '<th>offsets</th>'
  return `<thead id="thead">${res}</thead>`
}

function make_cell(
  lang_col: string,
  data: LineData,
  repo: Repo,
  count: number
): [string, number] {
  for (const repo_lang of repo.languages.edges) {
    if (repo_lang.node.name === lang_col) {
      return [`<td style="color: ${data.color}">x</td>`, count + 1]
    }
  }
  return ['<td></td>', count]
}

function add_cols_for_row(
  distributed: ReadonlyArray<[string, LineData]>,
  repo: Repo
): string {
  let row = ''
  let count = 0
  for (let col_idx = 0; col_idx < distributed.length; col_idx++) {
    const [lang_col, data] = distributed[col_idx]!
    const x = make_cell(lang_col, data, repo, count)
    count = x[1]
    row += x[0]
  }
  row += `<td>${count}</td>`

  let text = ''
  for (let i = 0; i < count; i++) {
    const offset = calc_offset(i)
    text += offset.toString() + ', '
  }
  row += `<td>${text}</td>`

  return row
}

// offset a station's position, if there are already n stations on the row
// only used for table
function calc_offset(nth_station: number): number {
  if (nth_station % 2 === 0) {
    return nth_station * MULTIPLIER
  }
  return -nth_station * MULTIPLIER
}
