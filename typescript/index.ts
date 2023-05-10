import { main } from "./lib.js"
import { Schema } from "./types.js"

fetch('./new.json')
  .then((response) => response.json())
  .then((j: Schema) => main(j))
  .then(s => document.write(s))

