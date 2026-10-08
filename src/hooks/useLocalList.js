import { useSyncExternalStore } from 'react'
import { getSnapshot, setList, subscribe } from '../lib/localList.js'

const EMPTY = []

export function useLocalList(key, max = Infinity) {
  const list = useSyncExternalStore(subscribe, () => getSnapshot(key), () => EMPTY)

  return {
    list,
    has: (id) => list.includes(id),
    isFull: list.length >= max,
    toggle: (id) => {
      const cur = getSnapshot(key)
      if (cur.includes(id)) setList(key, cur.filter((x) => x !== id))
      else if (cur.length < max) setList(key, [...cur, id])
    },
    remove: (id) => setList(key, getSnapshot(key).filter((x) => x !== id)),
    clear: () => setList(key, []),
  }
}

export const COMPARE_MAX = 3
export const useFavorites = () => useLocalList('far_favorites')
export const useCompare = () => useLocalList('far_compare', COMPARE_MAX)
