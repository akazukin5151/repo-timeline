export type NamedPoint = [string, number, number]

export type Schema = {
  readonly data: {
    readonly user: {
      readonly repositories: {
        readonly nodes: Array<Repo>
      }
    }
  }
}

export type Repo = {
  readonly name: string
  readonly createdAt: string
  readonly languages: {
    readonly edges: Array<Language>
  }
}

export type Language = {
  readonly size: number
  readonly node: {
    readonly color: string
    readonly name: string
  }
}

export type LineData = {
  readonly color: string
  readonly count: number
  readonly repo_idxs: Array<number>
  readonly repo_names: Array<string>
}

export type Options = {
  readonly render_table: boolean
  readonly linear: boolean
}

// const CURVE: d3.CurveFactory | d3.CurveFactoryLineOnly =
//   d3.curveCatmullRom.alpha(0.5)
// // d3.curveCardinal.tension(0.5)
// // d3.curveBumpY
