// A small memory of recent public answers (slots and designs), kept for 60 seconds.
// Many customers looking at the calendar then cost one database read a minute, not one
// each, which keeps a free database tier from being overwhelmed.
//
// Every admin change to slots or designs calls clear(), so her change shows on the
// public pages at once. (Only this copy of the server's memory is cleared; with a single
// server, as planned, that is all of it.)
const MAX_AGE = 60 * 1000 // milliseconds
const MAX_ENTRIES = 50 // a safety cap: e.g. someone asking for hundreds of different months

export function createPublicCache() {
  const entries = new Map() // key -> { value, expires }
  let generation = 0 // goes up on every clear()

  return {
    // Returns the remembered answer for `key`, or runs load() and remembers its answer.
    async get(key, load) {
      const hit = entries.get(key)
      if (hit && hit.expires > Date.now()) return hit.value

      const startedAt = generation
      const value = await load()
      // If she changed something while this was loading, don't keep the old answer.
      if (startedAt === generation) {
        if (entries.size >= MAX_ENTRIES) entries.clear()
        entries.set(key, { value, expires: Date.now() + MAX_AGE })
      }
      return value
    },

    clear() {
      generation += 1
      entries.clear()
    },
  }
}
