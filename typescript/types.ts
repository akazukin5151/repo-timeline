export type Schema = {
  data: {
    user: {
      repositories: {
        nodes: Array<Repo>
      }
    }
  }
}

export type Repo = {
  name: string
  createdAt: string
  languages: {
    edges: Array<Language>
  }
}

export type Language = {
  size: number
  node: {
    color: string
    name: string
  }
}

export type RepoData = {
  color: string
  count: number
  repo_idxs: Array<number>
}
