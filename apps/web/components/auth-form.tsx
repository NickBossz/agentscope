"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

interface AuthFormProps {
  mode: "signin" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      await apiRequest(`/v1/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          ...(mode === "signup"
            ? { name: String(form.get("name") ?? "") }
            : {}),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível autenticar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {mode === "signup" ? (
        <label className="grid gap-2">
          <span className="text-sm text-zinc-300">Nome</span>
          <input
            className="field"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
          />
        </label>
      ) : null}
      <label className="grid gap-2">
        <span className="text-sm text-zinc-300">E-mail</span>
        <input
          className="field"
          name="email"
          required
          type="email"
          autoComplete="email"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm text-zinc-300">Senha</span>
        <input
          className="field"
          name="password"
          required
          minLength={mode === "signup" ? 12 : 1}
          maxLength={128}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      {error ? (
        <p className="rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button className="button" disabled={submitting} type="submit">
        {submitting ? "Aguarde…" : mode === "signup" ? "Criar conta" : "Entrar"}
      </button>
    </form>
  );
}
