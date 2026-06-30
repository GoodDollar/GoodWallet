"use client"

import { useRef } from "react"
import { Button } from "ui"

import { CATEGORIES, type CategoryId } from "../../constants/categories.ts"
import styles from "./Events.module.css"

interface CategoryTabsProps {
  activeCategory: CategoryId
  onCategoryChange: (categoryId: CategoryId) => void
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const dashboardRootDiv = useRef<HTMLDivElement>(null)

  return (
    <div ref={dashboardRootDiv} className={"w-full scroll-smooth"}>
      <div className={styles.container}>
        {CATEGORIES.map((category) => (
          <Button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            variant={activeCategory === category.id ? "solid" : "outlined"}
            size="small"
            text={category.label}
          />
        ))}
      </div>
    </div>
  )
}
