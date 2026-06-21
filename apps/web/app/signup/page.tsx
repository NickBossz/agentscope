import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <main className="shell flex min-h-screen items-center justify-center py-12">
      <section className="panel w-full max-w-md p-7">
        <p className="font-mono text-sm text-violet-400">AgentScope</p>
        <h1 className="mt-2 text-3xl font-semibold">Criar conta</h1>
        <p className="mb-7 mt-2 text-zinc-400">
          Comece seu primeiro projeto monitorado.
        </p>
        <AuthForm mode="signup" />
        <p className="mt-5 text-sm text-zinc-400">
          Já possui conta?{" "}
          <Link
            className="text-violet-400 hover:text-violet-300"
            href="/signin"
          >
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
