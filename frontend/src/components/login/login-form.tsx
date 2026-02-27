"use client"

import { motion, type Variants, AnimatePresence } from "framer-motion"
import { ArrowRight, Eye, EyeOff, Mail, Lock, Sparkles, User } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_BASE_URL } from "@/config/api"
import { validateUsername, validateEmail, validatePassword } from "@/utils/validation"
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

function FloatingInput({
  id,
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  required = false,
  error
}: {
  id: string
  label: string
  type?: string
  icon: React.ElementType
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"
  const inputType = isPassword ? (showPassword ? "text" : "password") : type

  return (
    <div className="relative group">
      <div
        className={`absolute -inset-px rounded-xl transition-opacity duration-500 ${
          focused ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(6,182,212,0.3))",
          filter: "blur(8px)",
        }}
      />
      <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl transition-all duration-300 focus-within:border-indigo-500/50 focus-within:bg-white/[0.06]">
        <Icon className="ml-4 w-4 h-4 text-slate-500 flex-shrink-0" />
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label}
          required={required}
          className="w-full bg-transparent px-3 py-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          autoComplete={isPassword ? "current-password" : "email"}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="mr-4 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-xs text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

export function LoginForm() {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [formData, setFormData] = useState({ username: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({ username: "", email: "", password: "" })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setValidationErrors({ username: "", email: "", password: "" })

    // Validate inputs
    const usernameValidation = validateUsername(formData.username)
    const passwordValidation = validatePassword(formData.password)

    if (!usernameValidation.isValid || !passwordValidation.isValid) {
      setValidationErrors({
        username: usernameValidation.message || "",
        email: "",
        password: passwordValidation.message || "",
      })
      return
    }

    setLoading(true)
    try {
      const formBody = new URLSearchParams()
      formBody.append("username", formData.username)
      formBody.append("password", formData.password)

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
      })

      if (!response.ok) {
        throw new Error("Invalid credentials. Please check your username and password.")
      }

      const data = await response.json()
      localStorage.setItem("token", data.access_token)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setValidationErrors({ username: "", email: "", password: "" })

    // Validate all inputs
    const usernameValidation = validateUsername(formData.username)
    const emailValidation = validateEmail(formData.email)
    const passwordValidation = validatePassword(formData.password)

    if (!usernameValidation.isValid || !emailValidation.isValid || !passwordValidation.isValid) {
      setValidationErrors({
        username: usernameValidation.message || "",
        email: emailValidation.message || "",
        password: passwordValidation.message || "",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.detail?.includes("already exists") || errorData.detail?.includes("already registered")) {
          throw new Error("This username or email is already registered.")
        }
        throw new Error("Registration failed. Please try again.")
      }

      setError("")
      setIsRegistering(false)
      setFormData({ username: formData.username, email: "", password: formData.password })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 w-full max-w-md mx-auto flex flex-col justify-center h-full p-8 lg:p-12"
    >
      {/* Mobile logo */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 mb-6 lg:hidden">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <div className="w-3 h-3 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-sm" />
        </div>
        <span className="text-sm font-semibold text-slate-200">
          Reconstruct<span className="text-indigo-400">.AI</span>
        </span>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider">
              {isRegistering ? "Join Platform" : "Secure Access"}
            </span>
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-50 mb-3">
          {isRegistering ? "Create Account" : "Welcome back"}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {isRegistering 
            ? "Sign up to start building and reconstructing 3D models." 
            : "Sign in to your workspace to continue building and reconstructing 3D models."}
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-5">
        <motion.div variants={itemVariants}>
          <FloatingInput
            id="username"
            label="Username"
            type="text"
            icon={User}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            error={validationErrors.username}
            required
          />
        </motion.div>

        <AnimatePresence>
          {isRegistering && (
            <motion.div
              key="email-field"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={itemVariants}
            >
              <FloatingInput
                id="email"
                label="Email address"
                type="email"
                icon={Mail}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={validationErrors.email}
                required
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants}>
          <FloatingInput
            id="password"
            label="Password"
            type="password"
            icon={Lock}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={validationErrors.password}
            required
          />
          {isRegistering && <PasswordStrengthIndicator password={formData.password} />}
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="mt-2">
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white overflow-hidden transition-all duration-300"
          >
            {/* Gradient bg */}
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #4338ca 100%)",
              }}
            />
            {/* Hover shimmer */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(135deg, rgba(129,140,248,0.2) 0%, transparent 50%, rgba(6,182,212,0.15) 100%)",
                boxShadow: "0 0 40px rgba(99,102,241,0.4), inset 0 0 20px rgba(255,255,255,0.08)",
              }}
            />
            {loading ? (
               <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
            ) : (
              <>
                <span className="relative z-10">{isRegistering ? "Create Account" : "Enter Workspace"}</span>
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>
        </motion.div>
      </form>

      {/* Sign up link */}
      <motion.p variants={itemVariants} className="text-center text-sm text-slate-500 mt-10">
        {isRegistering ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError("");
            setValidationErrors({ username: "", email: "", password: "" });
          }}
          className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
        >
          {isRegistering ? "Sign in" : "Request Access"}
        </button>
      </motion.p>
      
      {/* Terms */}
      <motion.div variants={itemVariants} className="text-center mt-8">
        <p className="text-xs text-slate-600">
          {"By continuing, you agree to our "}
          <a href="#" className="underline hover:text-slate-400 transition-colors">Terms</a>
          {" and "}
          <a href="#" className="underline hover:text-slate-400 transition-colors">Privacy Policy</a>
        </p>
      </motion.div>
    </motion.div>
  )
}
