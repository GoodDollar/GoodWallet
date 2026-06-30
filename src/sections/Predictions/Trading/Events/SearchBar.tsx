"use client"

import { Icon } from "ui"

export default function SearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void
}) {
  return (
    <div className="flex items-center gap-3 w-full ">
      <div className="flex items-center gap-3 flex-1 bg-[#1a1a1a] rounded-xl px-4 py-3">
        <Icon name="BsSearch" />
        <input
          type="text"
          placeholder="Search"
          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-gray-500"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
