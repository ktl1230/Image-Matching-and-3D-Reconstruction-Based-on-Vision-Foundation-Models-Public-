import { PointCloudBackground } from "@/components/login/point-cloud-background"
import { BrandingPanel } from "@/components/login/branding-panel"
import { LoginForm } from "@/components/login/login-form"

export default function AuthPage() {
  return (
    <main className="relative min-h-screen bg-[#060a18] overflow-hidden">
      <PointCloudBackground />

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* Left Side — Branding & Visual Storytelling */}
        <div className="relative w-full lg:w-[55%] min-h-[50vh] lg:min-h-screen border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <BrandingPanel />
        </div>

        {/* Right Side — Login Form */}
        <div className="relative w-full lg:w-[45%] min-h-[50vh] lg:min-h-screen flex items-center justify-center">
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.06) 0%, transparent 60%)",
            }}
          />
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
