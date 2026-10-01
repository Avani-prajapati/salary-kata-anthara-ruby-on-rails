import { useState } from "react"

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 25

export function usePagination() {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)

  return { page, perPage, setPage, setPerPage }
}
