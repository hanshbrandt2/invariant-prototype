import {
  listWorkspaces,
  listHostedDatasets,
  listStarterPrompts,
  getStarterPrompt,
  listRecipes,
  listRunsByRecipe,
  getInvariants,
  listFindings,
} from "@/lib/data";
import Link from "next/link";
import { StartInput } from "@/components/dashboard/start-input";
import { HostedDataPicker } from "@/components/dashboard/hosted-data-picker";
import { UploadData } from "@/components/dashboard/upload-data";
import { WorkspaceViews } from "@/components/dashboard/workspace-views";
import { StarterStrip } from "@/components/dashboard/starter-strip";
import { RecipesShelf } from "@/components/dashboard/recipes-shelf";
import { FindingsShelf } from "@/components/dashboard/findings-shelf";

type View = "recent" | "all" | "starred";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; view?: string }>;
}) {
  const { state, view } = await searchParams;
  const initialView: View = view === "all" || view === "starred" ? view : "recent";
  const [workspaces, datasets, pool, recipes, runsByRecipe, invariants] = await Promise.all([
    listWorkspaces(),
    listHostedDatasets(),
    Promise.resolve(listStarterPrompts()),
    listRecipes(),
    listRunsByRecipe(),
    getInvariants(),
  ]);
  const pinLabels = Object.fromEntries(invariants.map((p) => [p.id, p.label]));
  const dateKey = new Date().toISOString().slice(0, 10);
  const starter = getStarterPrompt(dateKey);
  const examples = pool.filter((p) => p.text !== starter.text).slice(0, 3);
  const seeds = pool.slice(0, 3);

  const findings = listFindings();
  const newUser = state === "new" || workspaces.length === 0;

  return (
    <div className="mx-auto max-w-[1080px] px-5 md:px-8 py-8 md:py-10">
      {/* ── hero: start a new analysis, data-rooted ───────────────── */}
      <section id="hosted-data">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow text-clay">{newUser ? "Welcome — start here" : "New analysis"}</p>
          {!newUser && (
            <Link
              href="/workspace/new"
              className="font-mono text-meta uppercase tracking-[0.12em] text-muted hover:text-clay transition-colors"
            >
              + New workspace
            </Link>
          )}
        </div>
        <h1 className="mt-3 font-serif text-h1 font-semibold tracking-[-0.01em] leading-tight">
          What are you researching?
        </h1>
        <div className={`mt-7 grid grid-cols-1 ${newUser ? "lg:grid-cols-1 max-w-[720px]" : "lg:grid-cols-12"} gap-7`}>
          <div className={newUser ? "" : "lg:col-span-7"}>
            <StartInput initial={starter.text} examples={examples} />
          </div>
          <div className={newUser ? "mt-2" : "lg:col-span-5"}>
            <div className="flex items-baseline justify-between mb-2.5">
              <p className="eyebrow">or start from hosted data</p>
              <UploadData />
            </div>
            <HostedDataPicker datasets={datasets} />
          </div>
        </div>
      </section>

      {/* ── your workspaces (Recent / All / Starred) ──────────────── */}
      {!newUser && <WorkspaceViews workspaces={workspaces} initial={initialView} />}

      {/* ── recipes: validated workflows · manual → agentic ───────── */}
      {!newUser && recipes.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-h2 font-semibold">Recipes</h2>
            <span className="eyebrow">validated workflows · manual → agentic</span>
          </div>
          <RecipesShelf recipes={recipes} pinLabels={pinLabels} runsByRecipe={runsByRecipe} />
        </section>
      )}

      {/* ── findings: published, read-only, sealed results ────────── */}
      {!newUser && findings.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-h2 font-semibold">Findings</h2>
            <span className="eyebrow">published · read-only · sealed</span>
          </div>
          <FindingsShelf seeded={findings} />
        </section>
      )}

      {newUser && (
        <p className="mt-10 text-body text-muted">
          no workspaces yet — pick a dataset above or describe an idea, and your
          first research thread builds itself.
        </p>
      )}

      {/* ── start here strip ──────────────────────────────────────── */}
      <section id="community" className="mt-14 scroll-mt-20">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-serif text-h2 font-semibold">Start here</h2>
          <span className="eyebrow">curated · achievable by design</span>
        </div>
        <StarterStrip seeds={seeds} />
      </section>
    </div>
  );
}
