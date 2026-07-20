"use client"
import { useRef, useState, useEffect } from "react"

interface VideoPlayerProps {
  src: string
  title?: string
  className?: string
  style?: React.CSSProperties
}

export function VideoPlayer({ src, title = "Vidéo", className, style }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFull, setIsFull] = useState(false)

  useEffect(() => {
    const onFsChange = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  const toggleFs = async () => {
    if (!containerRef.current) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await containerRef.current.requestFullscreen()
    } catch {}
  }

  return (
    <div
      ref={containerRef}
      className={!isFull ? className : undefined}
      style={
        isFull
          ? { position: "relative", width: "100%", height: "100%", background: "#000" }
          : { position: "relative", ...style }
      }
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
      <button
        onClick={toggleFs}
        title={isFull ? "Quitter le plein écran" : "Plein écran"}
        aria-label={isFull ? "Quitter le plein écran" : "Plein écran"}
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(0,0,0,0.65)",
          border: "1.5px solid rgba(255,255,255,0.25)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {isFull ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 1V6H1M10 1V6H15M6 15V10H1M10 15V10H15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 6V1H6M15 6V1H10M1 10V15H6M15 10V15H10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  )
}
