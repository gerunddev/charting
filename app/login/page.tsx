import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="wrap narrow">
      <h1>Log in</h1>
      <AuthForm mode="login" />
      <p className="hint">
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
