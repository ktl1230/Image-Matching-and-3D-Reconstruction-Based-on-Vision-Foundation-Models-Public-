import { motion } from "framer-motion"
import { calculatePasswordStrength } from "@/utils/validation"

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password)

  if (!password) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-2 space-y-2"
    >
      {/* Strength bars */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              index < strength.score
                ? strength.score === 1
                  ? "bg-red-500"
                  : strength.score === 2
                  ? "bg-orange-500"
                  : strength.score === 3
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
                : "bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Strength label */}
      <p className={`text-xs font-medium ${strength.color}`}>
        {strength.message}
      </p>

      {/* Requirements checklist */}
      {strength.score < 3 && (
        <div className="text-xs text-slate-500 space-y-1 mt-2">
          <p className="font-medium">Password should contain:</p>
          <ul className="space-y-0.5 ml-4">
            <li className={password.length >= 8 ? "text-emerald-500" : ""}>
              • At least 8 characters
            </li>
            <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-emerald-500" : ""}>
              • Uppercase and lowercase letters
            </li>
            <li className={/[0-9]/.test(password) ? "text-emerald-500" : ""}>
              • At least one number
            </li>
            <li className={/[^a-zA-Z0-9]/.test(password) ? "text-emerald-500" : ""}>
              • Special character (recommended)
            </li>
          </ul>
        </div>
      )}
    </motion.div>
  )
}
