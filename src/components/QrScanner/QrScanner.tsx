"use client"

import { useEffect, useRef, useState } from "react"
import { Icon, Text } from "ui"

import { useTranslation } from "translations"

import { LoadingSpinner } from "../Snippet/LoadingSpinner"
import style from "./QrScanner.module.css"

type Props = {
  onScan: (result: string) => void
  openCamera?: boolean
}

export default function QrScanner({ onScan, openCamera = false }: Props) {
  const { translations } = useTranslation()
  const [isCameraOpen, setCameraOpen] = useState(openCamera)
  const [isCameraAllowed, setIsCameraAllowed] = useState<boolean | undefined>()

  // QR scanner refs and state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(true)

  // Check camera permissions when component mounts or camera is opened
  useEffect(() => {
    if (isCameraOpen) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop())
          setIsCameraAllowed(true)
        })
        .catch(() => setIsCameraAllowed(false))
    }
  }, [isCameraOpen])

  // QR code scanning logic
  useEffect(() => {
    if (!isCameraOpen || !isCameraAllowed) return

    let stream: MediaStream | null = null
    let animationFrameId: number

    const startScanner = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }

        const scanQrCode = async () => {
          if (!scanning) return

          if (
            videoRef.current &&
            canvasRef.current &&
            videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
          ) {
            const canvas = canvasRef.current
            const video = videoRef.current

            const context = canvas.getContext("2d")
            if (context) {
              canvas.height = video.videoHeight
              canvas.width = video.videoWidth

              context.drawImage(video, 0, 0, canvas.width, canvas.height)

              try {
                // Using a dynamic import for jsQR since it's a client-side only library
                const jsQR = (await import("jsqr")).default
                const imageData = context.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                )
                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "dontInvert",
                  },
                )

                const data = code?.data?.trim()

                if (data) {
                  setScanning(false)
                  onScan(data)
                  setCameraOpen(false) // This line already closes the camera after a QR code is read
                  return
                }
              } catch (error) {
                console.error("QR scanning error:", error)
              }
            }
          }

          animationFrameId = requestAnimationFrame(scanQrCode)
        }

        scanQrCode()
      } catch (error) {
        console.error("Failed to access camera:", error)
      }
    }

    startScanner()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isCameraOpen, isCameraAllowed, onScan, scanning])

  // Camera access denied
  if (isCameraAllowed === false) {
    return (
      <>
        <Text style="20-600" color="error" align="center">
          {translations.qrReader.cameraAccessDeniedTitle}
        </Text>
        <Text style="14-400" align="center">
          {translations.qrReader.cameraAccessDeniedBody}
        </Text>
      </>
    )
  }

  // Camera closed - show open camera button
  if (!isCameraOpen) {
    return (
      <div
        onClick={() => {
          setCameraOpen(true)
          setScanning(true)
        }}
        className={style.openCammeraButton}
      >
        <Icon name="BsQrCodeScan" size="big" />
        <Text style="16-600">{translations.walletConnect.scanQrCode}</Text>
      </div>
    )
  }

  // Camera open and allowed - show scanner
  if (isCameraOpen && isCameraAllowed === true) {
    return (
      <div className={style.qrCodeReader}>
        <video
          ref={videoRef}
          style={{ width: "100%", height: "auto" }}
          muted
          playsInline
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div className={style.scanOverlay}>
          <div className={style.scanMarker} />
        </div>
      </div>
    )
  }

  // Loading state while checking camera permissions
  return <LoadingSpinner />
}
