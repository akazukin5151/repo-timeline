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
