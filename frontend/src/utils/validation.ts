// Input validation utilities

export interface ValidationResult {
  isValid: boolean
  message?: string
}

export const validateUsername = (username: string): ValidationResult => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, message: "Username is required" }
  }
  if (username.length < 3) {
    return { isValid: false, message: "Username must be at least 3 characters" }
  }
  if (username.length > 20) {
    return { isValid: false, message: "Username must be less than 20 characters" }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, message: "Username can only contain letters, numbers, hyphens and underscores" }
  }
  return { isValid: true }
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, message: "Email is required" }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Please enter a valid email address" }
  }
  return { isValid: true }
}

export interface PasswordStrength {
  score: number // 0-4
  message: string
  color: string
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return { isValid: false, message: "Password is required" }
  }
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters" }
  }
  if (password.length > 128) {
    return { isValid: false, message: "Password is too long" }
  }
  return { isValid: true }
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, message: "Enter a password", color: "text-slate-500" }
  }

  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  // Cap at 4
  score = Math.min(score, 4)

  const strengthMap = {
    0: { message: "Very weak", color: "text-red-500" },
    1: { message: "Weak", color: "text-orange-500" },
    2: { message: "Fair", color: "text-yellow-500" },
    3: { message: "Good", color: "text-lime-500" },
    4: { message: "Strong", color: "text-emerald-500" },
  }

  return { score, ...strengthMap[score as keyof typeof strengthMap] }
}
