"use client"

import { type MouseEvent, useCallback } from "react"
import Image from "next/image"

export type CarouselItem<T = unknown> = {
  image: string
  header: string
  subheader: string
  data?: T
}

type CarouselItemProps<T = unknown> = {
  item: CarouselItem<T>
  onClick: (item: CarouselItem<T>) => unknown
}

export type CarouselProps = {
  className?: string
  carouselItems: CarouselItem[]
  onItemClick: (item: CarouselItem) => unknown
}

export const CarouselItem = ({ item, onClick }: CarouselItemProps) => {
  const { image, header, subheader } = item

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()

      onClick(item)
    },
    [onClick, item],
  )

  return (
    <div
      className="snap-start min-w-[40%] border border-gray-3 rounded-xl p-4"
      onClick={handleClick}
    >
      <div className="flex flex-col justify-between gap-3">
        <div>
          <Image
            className="rounded-full"
            src={image}
            alt={header}
            width={32}
            height={32}
          />
        </div>
        <div>
          <h5>{header}</h5>
          <h6>{subheader}</h6>
        </div>
      </div>
    </div>
  )
}

export const Carousel = ({
  className,
  carouselItems,
  onItemClick,
}: CarouselProps) => (
  <div
    className={`snap-x flex flex-row gap-4 overflow-x-auto no-scrollbar ${className}`}
  >
    {carouselItems.map((item) => (
      <CarouselItem item={item} key={item.header} onClick={onItemClick} />
    ))}
  </div>
)
