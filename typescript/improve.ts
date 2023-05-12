import { MULTIPLIER } from './constants.js'
import { NamedPoint, Repo } from './types.js'

export function improve_lines(
  all_stations: Map<string, Array<NamedPoint>>,
  repos: Array<Repo>,
  trunk: string,
) {
  fix_ends_crossing_trunk(
    all_stations,
    repos,
    trunk,
    (x) => x[0]!,
    (x) => x[1]!,
    (x) => x[2]!,
  )
  fix_ends_crossing_trunk(
    all_stations,
    repos,
    trunk,
    (x) => x[x.length - 1]!,
    (x) => x[x.length - 2]!,
    (x) => x[x.length - 3]!,
  )
  fix_x_shape(all_stations, repos)
  fix_crossing_at_start(all_stations, repos)
}

// fix either end of a line crossing the trunk
// move the start or end station to fix this
function fix_ends_crossing_trunk(
  all_stations: Map<string, Array<NamedPoint>>,
  repos: Array<Repo>,
  trunk: string,
  get_first_station: (stations: Array<NamedPoint>) => NamedPoint,
  get_second_station: (stations: Array<NamedPoint>) => NamedPoint,
  get_third_station: (stations: Array<NamedPoint>) => NamedPoint,
) {
  const trunk_x = all_stations.get(trunk)![0]![1]

  for (const [line, stations] of all_stations) {
    const first_station = get_first_station(stations)
    const second_station = get_second_station(stations)

    const first_x = first_station[1]
    const diff1 = trunk_x - first_x

    const second_x = second_station[1]
    const diff2 = trunk_x - second_x

    if (Math.sign(diff1) !== Math.sign(diff2)) {
      // the starting stations cross the trunk
      // check if there are other lines in the second station
      // if yes, move the first station to the second station's side
      // if not, move the second station to the first station's side
      const move_first = other_lines_in_station(
        repos,
        second_station[0],
        trunk,
        line,
      )
      if (move_first) {
        move_station(first_station, diff1)
      } else {
        // check if the third station is on the same side as the second
        const third = get_third_station(stations)
        const diff3 = trunk_x - third[1]
        // if no, shift second
        if (Math.sign(diff3) !== Math.sign(diff2)) {
          move_station(second_station, diff2)
        } else {
          // if yes, shift first anyway
          move_station(first_station, diff1)
        }
      }
    }
  }
}

function other_lines_in_station(
  repos: Array<Repo>,
  station_name: string,
  trunk: string,
  line_to_ignore: string,
): boolean {
  for (const station of repos) {
    // first, get for the station in question...
    if (station.name === station_name) {
      // then, look for the lines in that station
      for (const line of station.languages.edges) {
        // if we found another line that's not the one to ignore or not the trunk,
        // we have found another line in this station
        if (line.node.name !== trunk && line.node.name !== line_to_ignore) {
          return true
        }
      }
    }
  }
  return false
}

function move_station(station: NamedPoint, diff: number) {
  // scenario 1: station is on the right of trunk
  //  diff is negative; we want to move to the left by adding the negative diffs
  //  new position = old position + diff2 + diff2
  // scenario 2: station is on the left of trunk
  //  diff is positive; we want to move to the right by adding the positive diffs
  //  new position = old position + diff2 + diff2
  station[1] += 2 * diff
}

// we want to find a X structure like this
//
// 1: o      O
//     \    /
//      \  /
// 2:    Oo
//       ||
//        \
//        |\
// 3:    /  O
//      o
//
// the O line goes from right to left to right
// the o line goes from left to right to left
// the O and o stations should be swapped like this
//
// 1: o      O
//     \    /
//      \  /
// 2:    oO
//       ||
//       |\
//       | \
// 3:   /   O
//     o
//
// in this example, a line moves to direction L from station 1 to 2
// then it moves to direction R from 2 to 3
//
// l1\l2 | LL       | LR       | RL       | RR
// LL    | parallel | split    | merge    | x shape
// LR    | split    | parallel | x shape  | merge
// RL    | merge    | x shape  | parallel | split
// RR    | x shape  | merge    | split    | parallel
//
// LL/RR and RR/LL is actually fine because ideally they would be one
// single station
// and the two lines would meet at that singular station and then split
// so the x shapes in this table that needs to be fixed are RL/LR and LR/RL
//
// things get more complicated when there are vertical lines (direction 0)
//
// l1\l2 | 0L       | 0R       | L0       | R0
// 0L    | parallel | split    | x shape  | ʞ shape
// 0R    | split    | parallel | k shape  | x shape
// L0    | x shape  | k shape  | parallel | merge
// R0    | ʞ shape  | x shape  | merge    | parallel
//
// the k and mirrored k (ʞ) shapes are probably fine
// so all x shapes in this table needs to be fixed
function fix_x_shape(
  all_stations: Map<string, Array<NamedPoint>>,
  repos: Array<Repo>,
) {
  for (const station of repos) {
    for (const [l1, l2] of permutations(station.languages.edges)) {
      if (!l1 || !l2) {
        // skip to another line permutation
        continue
      }

      const stations1 = all_stations.get(l1.node.name)
      const stations2 = all_stations.get(l2.node.name)
      // some lines might be excluded because it has only 1 station
      if (!stations1 || !stations2) {
        continue
      }

      const idx1 = stations1.findIndex((s) => s[0] === station.name)
      const idx2 = stations2.findIndex((s) => s[0] === station.name)

      const before1 = stations1[idx1 - 1]
      const after1 = stations1[idx1 + 1]
      const before2 = stations2[idx2 - 1]
      const after2 = stations2[idx2 + 1]

      if (!before1 || !after1 || !before2 || !after2) {
        continue
      }

      const l1_station = stations1[idx1]!
      const l1_dir_from = l1_station[1] - before1[1]
      const l1_dir_to = after1[1] - l1_station[1]
      if (Math.sign(l1_dir_from) === Math.sign(l1_dir_to)) {
        continue
      }
      // l1 is LR or RL

      const l2_station = stations2[idx2]!
      const l2_dir_from = l2_station[1] - before2[1]
      const l2_dir_to = after2[1] - l2_station[1]
      if (Math.sign(l2_dir_from) === Math.sign(l2_dir_to)) {
        continue
      }
      // l2 is LR or RL

      if (Math.sign(l1_dir_from) === Math.sign(l2_dir_from)) {
        continue
      }
      // l1 and l2 are opposing (either LR and RL or RL and LR)

      // ignore k shapes and mirrored k (ʞ) shapes
      // 0R L0 and 0L R0 both mean:
      // - l1_from and l2_to are 0
      // - l1_to and l2_from are different
      if (
        l1_dir_from === 0 &&
        l2_dir_to === 0 &&
        Math.sign(l1_dir_to) !== Math.sign(l2_dir_from)
      ) {
        continue
      }
      // if l1 is L, l2 must be R (and vice versa)
      // therefore the departing directions must be opposites as well
      // as we have already checked that l1 and l2 have different directions

      const station_diff = l2_station[1] - l1_station[1]

      // negative means s1 is on the right and s2 is on left
      // positive means s2 is on the right and s1 is on left
      // if s1 is on right (negative) then l1_dir_from must be negative too
      //   (going to left, meeting the station from the right)
      //   as it has to be from the right
      // if s1 is on left (positive) then l1_dir_from must be positive too
      //   (going to right, meeting the station from the left)
      //   so if the signs are different, we need to move the stations
      if (Math.sign(station_diff) !== Math.sign(l1_dir_from)) {
        // pick a line that stops at this station
        for (const line of station.languages.edges) {
          const line_stations = all_stations.get(line.node.name)!
          // get their platform for this station
          const other_platform = line_stations.find(
            (x) => x[0] === l1_station[0],
          )
          // move l1_station, ensuring it doesn't overlap with the platform
          // there's no reason why we can't move l2_station instead...
          if (other_platform && other_platform[1] !== l1_station[1]) {
            // console.log(l1_station[0], l1.node.name, l2.node.name)
            if (station_diff < 0) {
              // s1 is on right, move to left
              while (l1_station[1] >= other_platform[1]) {
                l1_station[1] -= MULTIPLIER
              }
            } else {
              // s1 is on left, move to right
              while (l1_station[1] <= other_platform[1]) {
                l1_station[1] += MULTIPLIER
              }
            }
          }
        }
      }
    }
  }
}

function* permutations<T>(
  arr: Array<T>,
): Generator<[T | undefined, T | undefined]> {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      yield [arr[i], arr[j]]
    }
  }
}

// fix platforms that start at the same station and then immediately
// cross
// this only looks at the first and second stations
//
// l1\l2 | L       | R                | 0
// L     | //      | x or /\          | /|
// R     | x or /\ | \\               | |\
// 0     | /| or ł | |\ or ł flipped  | ||
//
// these are the four possible shapes involving 0s:
//
//   A        B        C        D
//
//   O o    o O        o O     O o
//   |/      \|       /  |     |  \
//   |        |      /   |     |   \
//  /|        |\    /    |     |    \
//
// shapes like \\, //, /\, and || are fine
// C and D are fine
// shapes like x are not
// A and B are not
//
// we can't distinguish between x or /\ with only
// direction-from-first-station information
// we need the position of the platforms
//
// we also need that to distinguish between the four possible shapes
// involving 0s
//
// "L,R" means the first platform has a line to the left and the second
// has a line to the right.
// if the first platform is on the right of the second,
// its line going left must intersect with the other line going right
//
// line dir\first platform on ___ of second | L  | R
// L,R                                      | /\ | x
// R,L                                      | x  | /\
//
// 0s need special handling (platforms are always distinct and never have 0s)
//
// line dir\first platform on ___ of second | L | R
// L,0                                      | C | A
// R,0                                      | B | D
// 0,L                                      | A | C
// 0,R                                      | D | B
function fix_crossing_at_start(
  all_stations: Map<string, Array<NamedPoint>>,
  repos: Array<Repo>,
) {
  console.log('======== start ============')
  for (const repo of repos) {
    // lines whose first station is this station
    const lines = repo.languages.edges.filter((lang) => {
      const stations_on_line = all_stations.get(lang.node.name)
      return stations_on_line && stations_on_line[0]![0] === repo.name
    })
    if (lines.length > 1) {
      for (const [l1, l2] of permutations(lines)) {
        if (!l1 || !l2) {
          continue
        }
        // we've already filtered out lines that aren't in all_stations
        const l1_stations = all_stations.get(l1.node.name)!
        const l2_stations = all_stations.get(l2.node.name)!

        const l1_first = l1_stations[0]!
        const l1_second = l1_stations[1]!
        const l2_first = l2_stations[0]!
        const l2_second = l2_stations[1]!

        const l1_dir_from = l1_second[1] - l1_first[1]
        const l2_dir_from = l2_second[1] - l2_first[1]
        if (Math.sign(l1_dir_from) === Math.sign(l2_dir_from)) {
          // the lines are L,L (//) or R,R (\\)
          continue
        }

        // if we need to move right from 1 to 2, then 1 is on the left
        // so we need to do l1_first - l2_first
        // "we need to move left from 2 to 1, so 1 is on the left"
        const station_dir = l1_first[1] - l2_first[1]
        if (Math.sign(l1_dir_from) === Math.sign(station_dir)) {
          // line dir is L,R and station dir is L,R, or
          // R,L and R,L respectively
          continue
        }
        // line dir and station dir must be opposites
        // either L,R and R,L, or R,L and L,R
        // or 0s

        // || is fine
        if (l1_dir_from === 0 && l2_dir_from === 0) {
          continue
        }

        // filter out C and D
        // L,0 and L, R,0 and D, 0,L and R, 0,R and L

        // 0,L and R
        // 0,R and L
        // if l1_dir_from is 0, l2_dir_from can't be zero in this branch
        // so if l2_dir_from has a different sign from station_dir,
        // they're either L and R or R and L
        if (
          l1_dir_from === 0 &&
          Math.sign(l2_dir_from) !== Math.sign(station_dir)
        ) {
          continue
        }

        // L,0 and L
        // R,0 and R
        // if l2_dir_from is 0, l1_dir_from can't be zero in this branch
        // so if l1_dir_from has the same sign from station_dir,
        // they're either L and L or R and R
        if (
          l2_dir_from === 0 &&
          Math.sign(l1_dir_from) === Math.sign(station_dir)
        ) {
          continue
        }

        // move the right (second) platform to the left
        // (arbitrary choice)
        // TODO: copied
        for (const line of repo.languages.edges) {
          const line_stations = all_stations.get(line.node.name)
          if (!line_stations) {
            continue
          }
          // get their platform for this station
          const other_platform = line_stations.find((x) => x[0] === repo.name)
          if (other_platform && other_platform[1] !== l2_first[1]) {
            while (l2_first[1] >= other_platform[1]) {
              l2_first[1] -= MULTIPLIER
            }
          }
        }
      }
    }
  }
}
