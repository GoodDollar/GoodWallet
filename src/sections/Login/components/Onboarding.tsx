import { useRef, useState } from "react"
import Image from "next/image"
import { Button, Slide1, Slide2, Slide3, Slide4, Text } from "ui"

import { Logo } from "@/components/Typo/Logo"
import { useTranslation } from "@/translations"

import styles from "./Onboarding.module.css"

const SLIDE_ILLUSTRATIONS = [Slide1, Slide2, Slide3, Slide4]

export const Onboarding = (props: { close: () => void }) => {
  const { translations } = useTranslation()

  const slides = translations.onboarding.slides.map((slide, index) => ({
    illustration: SLIDE_ILLUSTRATIONS[index],
    title: slide.title,
    description: slide.description,
  }))

  const [currentSlide, setCurrentSlide] = useState(0)
  const sliderContainer = useRef<HTMLDivElement>(null)

  const scrollToSlide = (index: number) => {
    if (!sliderContainer.current) return

    sliderContainer.current.scrollTo({
      left: sliderContainer.current.clientWidth * index,
      behavior: "smooth",
    })
  }

  return (
    <div className={styles.container}>
      <Logo className="m-auto" />

      <div
        className={styles.sliderContainer}
        ref={sliderContainer}
        onScroll={(e) => {
          const { scrollLeft, clientWidth } = e.currentTarget
          const slideIndex = Math.round(scrollLeft) / clientWidth
          if (slideIndex === currentSlide) return
          setCurrentSlide(slideIndex)
        }}
      >
        {slides.map((slide) => (
          <div key={slide.title} className={styles.slide}>
            <Image src={slide.illustration} alt="" width={64} height={64} />
            <Text align="center" style="24-600">
              {slide.title}
            </Text>
            <Text align="center" style="16-400" color="text-secondary">
              {slide.description}
            </Text>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.navigation}>
          <Button
            variant="icon"
            icon="BsChevronLeft"
            size="small"
            disabled={currentSlide === 0}
            onClick={() => {
              if (currentSlide > 0) {
                setCurrentSlide(currentSlide - 1)
                scrollToSlide(currentSlide - 1)
              }
            }}
          />

          <div className={styles.dots}>
            {slides.map((_, index) => (
              <Button
                key={index}
                variant="icon"
                icon="BsCircleFill"
                size="small"
                onClick={() => {
                  setCurrentSlide(index)
                  scrollToSlide(index)
                }}
                color={index === currentSlide ? undefined : "dim"}
              />
            ))}
          </div>

          <Button
            variant="icon"
            icon="BsChevronRight"
            size="small"
            disabled={currentSlide === slides.length - 1}
            onClick={() => {
              if (currentSlide < slides.length - 1) {
                setCurrentSlide(currentSlide + 1)
                scrollToSlide(currentSlide + 1)
              }
            }}
          />
        </div>
        <Button variant="outlined" full text="Sign In" onClick={props.close} />
      </div>
    </div>
  )
}
