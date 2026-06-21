import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell flex min-h-screen items-center py-16">
      <div className="grid w-full items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <p className="mb-4 font-mono text-sm uppercase tracking-[0.24em] text-violet-400">
            Observability for AI agents
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
            Entenda cada decisão do seu agente.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            O AgentScope reúne traces, spans, prompts, ferramentas, custos e
            erros em uma visão preparada para investigação.
          </p>
          <div className="mt-8 flex gap-3">
            <Link className="button" href="/signup">
              Criar conta
            </Link>
            <Link className="button button-secondary" href="/signin">
              Entrar
            </Link>
          </div>
        </section>
        <aside className="panel p-6">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-mono text-sm text-zinc-400">agent.run</span>
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-300">
              success
            </span>
          </div>
          <div className="space-y-4">
            {[
              ["agent", "Planejar resposta", "18 ms"],
              ["llm", "gpt-5", "842 ms"],
              ["tool", "search_documents", "126 ms"],
            ].map(([type, name, duration]) => (
              <div
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
                key={name}
              >
                <div className="flex justify-between gap-4">
                  <span>{name}</span>
                  <span className="font-mono text-sm text-zinc-500">
                    {duration}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs uppercase text-violet-400">
                  {type}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
