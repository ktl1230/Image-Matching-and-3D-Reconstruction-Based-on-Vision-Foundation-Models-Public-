"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

// Seeded random for consistent particle generation
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// 3D point cloud building vertices
function generateBuildingPoints(): { x: number; y: number; z: number; brightness: number }[] {
  const points: { x: number; y: number; z: number; brightness: number }[] = []

  // Main tower
  for (let i = 0; i < 500; i++) {
    const seed = i * 1.618
    const rx = seededRandom(seed) * 2 - 1
    const ry = seededRandom(seed + 1) * 3 - 0.5
    const rz = seededRandom(seed + 2) * 2 - 1

    // Edges & wireframe of main tower
    const onEdgeX = Math.abs(rx) > 0.85
    const onEdgeZ = Math.abs(rz) > 0.85
    const onEdgeY = ry > 2.3 || ry < -0.3

    if (onEdgeX || onEdgeZ || onEdgeY || seededRandom(seed + 3) > 0.7) {
      points.push({ x: rx * 1.2, y: ry, z: rz * 1.2, brightness: 0.4 + seededRandom(seed + 4) * 0.6 })
    }
  }

  // Secondary shorter building
  for (let i = 0; i < 250; i++) {
    const seed = (i + 500) * 1.618
    const rx = seededRandom(seed) * 1.6 - 0.8 + 2.5
    const ry = seededRandom(seed + 1) * 2 - 0.5
    const rz = seededRandom(seed + 2) * 1.6 - 0.8

    const onEdgeX = Math.abs(rx - 2.5) > 0.65
    const onEdgeZ = Math.abs(rz) > 0.65
    const onEdgeY = ry > 1.3 || ry < -0.3

    if (onEdgeX || onEdgeZ || onEdgeY || seededRandom(seed + 3) > 0.75) {
      points.push({ x: rx, y: ry, z: rz, brightness: 0.3 + seededRandom(seed + 4) * 0.5 })
    }
  }

  // Small accent building
  for (let i = 0; i < 150; i++) {
    const seed = (i + 750) * 1.618
    const rx = seededRandom(seed) * 1.2 - 0.6 - 2.2
    const ry = seededRandom(seed + 1) * 1.5 - 0.5
    const rz = seededRandom(seed + 2) * 1.2 - 0.6

    const onEdge = Math.abs(rx + 2.2) > 0.45 || Math.abs(rz) > 0.45 || ry > 0.8 || ry < -0.3

    if (onEdge || seededRandom(seed + 3) > 0.8) {
      points.push({ x: rx, y: ry, z: rz, brightness: 0.25 + seededRandom(seed + 4) * 0.5 })
    }
  }

  // Ground plane grid
  for (let i = 0; i < 200; i++) {
    const seed = (i + 1000) * 1.618
    const rx = seededRandom(seed) * 10 - 5
    const rz = seededRandom(seed + 1) * 10 - 5
    points.push({ x: rx, y: -0.5, z: rz, brightness: 0.15 + seededRandom(seed + 2) * 0.2 })
  }

  // Floating ambient particles
  for (let i = 0; i < 100; i++) {
    const seed = (i + 1200) * 1.618
    points.push({
      x: seededRandom(seed) * 8 - 4,
      y: seededRandom(seed + 1) * 4 - 0.5,
      z: seededRandom(seed + 2) * 8 - 4,
      brightness: 0.1 + seededRandom(seed + 3) * 0.3,
    })
  }

  return points
}

const BUILDING_POINTS = generateBuildingPoints()

function PointCloudCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
    }

    resize()
    window.addEventListener("resize", resize)

    function render(time: number) {
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)

      const rotationY = time * 0.0001
      const rotationX = 0.3
      const cosY = Math.cos(rotationY)
      const sinY = Math.sin(rotationY)
      const cosX = Math.cos(rotationX)
      const sinX = Math.sin(rotationX)
      const floatOffset = Math.sin(time * 0.0005) * 0.3

      const centerX = w * 0.5
      const centerY = h * 0.48
      const scale = Math.min(w, h) * 0.08

      // Sort by depth for proper rendering
      const projected = BUILDING_POINTS.map((p) => {
        const x1 = p.x * cosY - p.z * sinY
        const z1 = p.x * sinY + p.z * cosY
        const y1 = (p.y + floatOffset) * cosX - z1 * sinX
        const z2 = (p.y + floatOffset) * sinX + z1 * cosX
        const perspective = Math.max(0.01, 6 / (6 + z2))

        return {
          sx: centerX + x1 * scale * perspective,
          sy: centerY - y1 * scale * perspective,
          depth: z2,
          brightness: p.brightness * perspective,
          size: Math.max(0.5, perspective * 1.5),
        }
      }).sort((a, b) => b.depth - a.depth)

      for (const p of projected) {
        const depthFade = Math.max(0, Math.min(1, 1 - (p.depth + 5) / 12))
        const alpha = p.brightness * depthFade

        // Glow effect for brighter points
        if (alpha > 0.3) {
          const glowRadius = Math.max(1, p.size * 4)
          const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glowRadius)
          glow.addColorStop(0, `rgba(99, 130, 241, ${alpha * 0.15})`)
          glow.addColorStop(1, "rgba(99, 130, 241, 0)")
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(p.sx, p.sy, glowRadius, 0, Math.PI * 2)
          ctx.fill()
        }

        // Main point
        const r = Math.round(99 + (6 - 99) * (p.depth > 0 ? 0 : Math.abs(p.depth) * 0.1))
        const g = Math.round(102 + (182 - 102) * (p.depth > 0 ? 0 : Math.abs(p.depth) * 0.1))
        const b = Math.round(241 + (212 - 241) * (p.depth > 0 ? 0 : Math.abs(p.depth) * 0.1))
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

const CODE_KEYWORDS = [
  "DINOv2", "COLMAP", "LIGHTGLUE", "LoFTR", "SuperGlue",
  "MVS", "SfM", "NeRF", "SIFT", "Feature",
  "Match()", "Sparse", "Dense", "Depth", "Pose",
  "Bundle", "Adjust", "Triangulate", "Keypoint", "Descriptor",
  "Gaussian", "Splat", "Radiance", "Voxel", "Mesh",
  "PointCloud", "import", "model.fit()", "optimize()", "render3D",
]

function CodeRainColumn({ index, total }: { index: number; total: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const leftPercent = ((index + 0.5) / total) * 100
  const duration = 15 + (index % 4) * 5
  const isCyan = index % 3 === 0

  return (
    <div
      className="absolute top-0 font-mono text-[10px] tracking-wider whitespace-nowrap animate-code-scroll pointer-events-none"
      style={{
        left: `${leftPercent}%`,
        animationDuration: `${duration}s`,
        animationDelay: `${-index * 2.5}s`,
        maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      <div className="flex flex-col gap-4">
        {[...CODE_KEYWORDS, ...CODE_KEYWORDS].map((word, i) => {
          const highlight = (i + index) % 7 === 0
          return (
            <span
              key={`${index}-${i}`}
              className="block"
              style={{
                color: highlight
                  ? isCyan
                    ? "rgba(6, 182, 212, 0.7)"
                    : "rgba(129, 140, 248, 0.7)"
                  : isCyan
                    ? "rgba(6, 182, 212, 0.2)"
                    : "rgba(129, 140, 248, 0.2)",
                textShadow: highlight
                  ? isCyan
                    ? "0 0 8px rgba(6, 182, 212, 0.5)"
                    : "0 0 8px rgba(129, 140, 248, 0.5)"
                  : "none",
              }}
            >
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function PointCloudBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 animate-grid-fade"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* 3D point cloud building */}
      <PointCloudCanvas />

      {/* Code rain columns */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <CodeRainColumn key={i} index={i} total={8} />
        ))}
      </div>

      {/* Large radial glows */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{
          top: "-10%",
          left: "20%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{
          bottom: "-5%",
          right: "10%",
          background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  )
}
