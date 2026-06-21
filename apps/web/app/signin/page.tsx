import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <main className="shell flex min-h-screen items-center justify-center py-12">
      <section className="panel w-full max-w-md p-7">
        <p className="font-mono text-sm text-violet-400">AgentScope</p>
        <h1 className="mt-2 text-3xl font-semibold">Entrar</h1>
        <p className="mb-7 mt-2 text-zinc-400">
          Continue para seu workspace de observabilidade.
        </p>
        <AuthForm mode="signin" />
        <p className="mt-5 text-sm text-zinc-400">
          Ainda não tem conta?{" "}
          <Link
            className="text-violet-400 hover:text-violet-300"
            href="/signup"
          >
            Cadastre-se
          </Link>
        </p>
      </section>
    </main>
  );
}
