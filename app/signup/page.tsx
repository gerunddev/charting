import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="wrap narrow">
      <h1>Create an account</h1>
      <AuthForm mode="signup" />
      <p className="hint">
        Already have one? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
