import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" signInFallbackRedirectUrl="/dashboard" />
    </div>
  );
}
