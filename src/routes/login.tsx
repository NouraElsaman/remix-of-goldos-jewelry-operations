import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldAlert } from "lucide-react";

import LogoAr from "@/assets/branding/logo-ar.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";

import { authenticateUserAsync, getDefaultRouteForRole } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — جوهرة تك" },
      {
        name: "description",
        content: "منصة إدارة عمليات محلات الذهب والمجوهرات في مصر.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isRTL, setLocale, locale } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const authResult = await authenticateUserAsync(email, password);
      if (authResult) {
        const { user, role } = authResult;
        localStorage.setItem("goldos_auth_token", `mock-jwt-token-${user.id}`);
        localStorage.setItem("goldos_user_role", role);
        localStorage.setItem("goldos_current_user", JSON.stringify(user));

        const targetRoute = getDefaultRouteForRole(role);
        void navigate({ to: targetRoute as any });
        return;
      }
    } catch (err) {
      // ignore
    }

    setError(
      locale === "ar"
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        : "Invalid email or password",
    );
    setIsSubmitting(false);
  };

  return (
    <PageTransition className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Top Header Bar */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5 outline-none">
          <img
            src={LogoAr}
            alt="جوهرة تك"
            className="h-9 w-auto object-contain"
          />
        </Link>

        <button
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="rounded-xl border border-border/80 bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-all"
        >
          {locale === "ar" ? "English" : "العربية"}
        </button>
      </header>

      {/* Main Login Card */}
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-3">
          {/* Centered Brand Logo — 64px height */}
          <img
            src={LogoAr}
            alt="جوهرة تك"
            className="h-[64px] w-auto object-contain mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {locale === "ar" ? "تسجيل الدخول" : "Sign In"}
          </h1>
          <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
            {locale === "ar"
              ? "منصة إدارة عمليات الذهب والمجوهرات"
              : "Jewelry Operations Platform"}
          </p>
        </div>

        {/* Card Frame */}
        <div className="rounded-3xl border border-border/80 bg-surface p-7 shadow-raised">
          <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
            {/* Error Message */}
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/8 p-3.5 text-xs font-semibold text-destructive"
                role="alert"
              >
                <ShieldAlert className="size-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </motion.div>
            ) : null}

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {locale === "ar" ? "البريد الإلكتروني" : "Email Address"}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="nourahelaly56@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 font-mono text-sm"
                  dir="ltr"
                />
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {locale === "ar" ? "كلمة المرور" : "Password"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 font-mono text-sm"
                  dir="ltr"
                />
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="gold"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl text-sm font-semibold gap-2 shadow-gold mt-2"
            >
              <span>{locale === "ar" ? "دخول إلى النظام" : "Sign In"}</span>
              <ArrowIcon className="size-4" aria-hidden />
            </Button>
          </form>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground/70">
        جوهرة تك · {new Date().getFullYear()}
      </footer>
    </PageTransition>
  );
}
