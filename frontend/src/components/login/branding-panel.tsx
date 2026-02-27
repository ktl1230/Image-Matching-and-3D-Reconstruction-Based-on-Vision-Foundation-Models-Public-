"use client"

import { motion, type Variants } from "framer-motion"
import { Images, Brain, Box, Cloud } from "lucide-react"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

function CubeIcon() {
  return (
    <div className="relative w-10 h-10">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          d="M20 4L36 13V27L20 36L4 27V13L20 4Z"
          stroke="url(#cube-grad)"
          strokeWidth="1.5"
          fill="rgba(99,102,241,0.08)"
        />
        <path d="M20 4L36 13L20 22L4 13L20 4Z" fill="rgba(99,102,241,0.15)" stroke="url(#cube-grad)" strokeWidth="1" />
        <path d="M20 22V36" stroke="url(#cube-grad)" strokeWidth="1.5" />
        <path d="M36 13L20 22" stroke="url(#cube-grad)" strokeWidth="1" opacity="0.5" />
        <path d="M4 13L20 22" stroke="url(#cube-grad)" strokeWidth="1" opacity="0.5" />
        <defs>
          <linearGradient id="cube-grad" x1="4" y1="4" x2="36" y2="36">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 rounded-lg blur-lg opacity-30" style={{ background: "rgba(99,102,241,0.4)" }} />
    </div>
  )
}

function PipelineCard() {
  return (
    <motion.div
      variants={itemVariants}
      className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 overflow-hidden"
    >
      {/* Glass shimmer */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
        }}
      />

      <p className="text-sm font-medium text-slate-400 mb-5 relative z-10">Processing Pipeline</p>
      <div className="flex items-center justify-between gap-2 relative z-10">
        {/* Step 1: Images */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Images className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="text-xs text-slate-500">Images</span>
        </div>

        {/* Connector */}
        <div className="flex-1 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-indigo-500/40 to-cyan-500/40 relative">
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400"
              animate={{ x: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Step 2: AI Clustering */}
        <div className="flex flex-col items-center gap-2 relative">
          <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative">
            <Brain className="w-6 h-6 text-cyan-400" />
            <div className="absolute inset-0 rounded-xl animate-glow-pulse" style={{ boxShadow: "0 0 20px rgba(6,182,212,0.3)" }} />
          </div>
          <span className="text-xs text-cyan-400 font-medium">AI Clustering</span>
        </div>

        {/* Connector */}
        <div className="flex-1 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-cyan-500/40 to-indigo-500/40 relative">
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400"
              animate={{ x: ["0%", "100%", "0%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
          </div>
        </div>

        {/* Step 3: 3D Model */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Box className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="text-xs text-slate-500">3D Model</span>
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadges() {
  return (
    <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-4 py-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs text-slate-400">Web Service Online</span>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-4 py-2">
        <Cloud className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs text-slate-400">Cloud Processing</span>
      </div>
    </motion.div>
  )
}

export function BrandingPanel() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12"
    >
      {/* Top: Logo */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <CubeIcon />
        <span className="text-lg font-semibold tracking-tight text-slate-200">
          Reconstruct<span className="text-indigo-400">.AI</span>
        </span>
      </motion.div>

      {/* Center: Headline + Pipeline */}
      <div className="flex flex-col gap-8 my-auto py-8">
        <div className="flex flex-col gap-3">
          <motion.h1
            variants={itemVariants}
            className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-balance text-slate-100 leading-tight"
          >
            Intelligent 3D
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Reconstruction
            </span>
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-sm lg:text-base text-slate-400 max-w-md leading-relaxed"
          >
            Image Matching and 3D Reconstruction Based on Vision Foundation Models
          </motion.p>
        </div>

        <PipelineCard />

        {/* Tech stack tags */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          {["DINOv2", "COLMAP", "LightGlue", "LoFTR"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs font-mono text-slate-500"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Bottom: Status Badges */}
      <StatusBadges />
    </motion.div>
  )
}
