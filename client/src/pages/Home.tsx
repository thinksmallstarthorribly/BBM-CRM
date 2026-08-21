import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { LEAD_STAGES } from "@shared/crm";
import { ArrowRight, BriefcaseBusiness, CalendarDays, CircleDollarSign, Clock3, FileWarning, RefreshCw, Sparkles, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const perthDay = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Perth", weekday: "long" }).format(new Date());

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function KpiCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string | number; detail: string; icon: typeof UsersRound; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = { blue: "text-primary bg-primary/10", green: "text-emerald-400 bg-emerald-400/10", amber: "text-amber-400 bg-amber-400/10", red: "text-rose-400 bg-rose-400/10" };
  return <Card className="engine-card relative overflow-hidden border-0"><CardContent className="p-4 sm:p-5"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4.5 w-4.5" /></div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent><div className={`absolute bottom-0 left-0 h-[3px] w-full ${tone === "blue" ? "bg-primary" : tone === "green" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : "bg-rose-400"}`} /></Card>;
}

export default function Home() {
  const summary = trpc.dashboard.summary.useQuery();
  const settings = trpc.ai.settings.useQuery();
  const utils = trpc.useUtils();
  const generate = trpc.ai.generateBriefing.useMutation({ onSuccess: async () => { toast.success("Morning briefing generated"); await Promise.all([utils.dashboard.summary.invalidate(), utils.ai.settings.invalidate()]); }, onError: error => toast.error(error.message) });
  const schedule = trpc.ai.setMorningBriefingSchedule.useMutation({ onSuccess: async result => { toast.success(result.enabled ? "Daily 6:00am Perth briefing enabled" : "Daily briefing paused"); await utils.ai.settings.invalidate(); }, onError: error => toast.error(error.message) });

  if (summary.isLoading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}</div>;
  if (summary.error) return <div className="engine-card rounded-2xl p-8"><h1 className="text-2xl font-bold uppercase">Dashboard unavailable</h1><p className="mt-2 text-muted-foreground">{summary.error.message}</p><Button onClick={() => summary.refetch()} className="mt-5">Try again</Button></div>;

  const data = summary.data!;
  const maxStage = Math.max(1, ...Object.values(data.stageCounts));
  const priorities = strings(data.briefing?.priorities);

  return <div className="space-y-4 sm:space-y-5">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-display text-xs font-bold uppercase tracking-[0.26em] text-primary">Home</h1><p className="mt-1 font-display text-4xl font-extrabold uppercase leading-none text-white sm:text-5xl">Run the business.<br/><span className="text-muted-foreground">Not the chaos.</span></p></div><Link href="/lead-lifecycle"><Button className="w-full sm:w-auto">Open lead pipeline <ArrowRight className="h-4 w-4" /></Button></Link></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Active leads" value={data.activeLeads} detail="New through won" icon={BriefcaseBusiness} />
      <KpiCard label="Active clients" value={data.activeClients} detail="Live cleaning accounts" icon={UsersRound} tone="green" />
      <KpiCard label="Monthly revenue" value={money.format(data.monthlyRevenueCents / 100)} detail="Paid this month" icon={CircleDollarSign} tone="green" />
      <KpiCard label="Outstanding" value={money.format(data.outstandingInvoiceCents / 100)} detail="Sent, due or overdue" icon={FileWarning} tone={data.outstandingInvoiceCents > 0 ? "amber" : "blue"} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_.8fr]">
      <Card className="engine-card border-0"><CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/70 pb-3"><CardTitle className="flex items-center gap-2 font-display text-lg uppercase"><Clock3 className="h-4 w-4 text-primary" /> Needs action</CardTitle><Link href="/all-leads" className="text-xs font-semibold text-primary hover:text-white">View all</Link></CardHeader><CardContent className="p-0">{data.priorityLeads.length ? data.priorityLeads.map(lead => <Link key={lead.id} href={`/all-leads?lead=${lead.id}`} className="group flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0 hover:bg-white/[.025]"><div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"/><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white group-hover:text-primary">{lead.businessName}</p><p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{lead.nextAction || "Set the next action"}</p></div><div className="rounded-md bg-secondary px-2 py-1 font-display text-xs font-bold text-white">{lead.aiLeadScore ?? lead.checklistScore ?? "—"}</div></Link>) : <div className="p-8 text-center text-sm text-muted-foreground">No active leads yet. Add one or connect the checklist feed.</div>}</CardContent></Card>

      <Card className="engine-card border-0"><CardHeader className="border-b border-border/70 pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 font-display text-lg uppercase"><Sparkles className="h-4 w-4 text-primary" /> Morning briefing</CardTitle><span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{perthDay}</span></div></CardHeader><CardContent className="p-5">{data.briefing ? <><p className="leading-6 text-foreground/90">{data.briefing.summary}</p>{priorities.length ? <div className="mt-4 space-y-2">{priorities.slice(0, 3).map(priority => <p key={priority} className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{priority}</p>)}</div> : null}<p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Generated {new Date(data.briefing.generatedAt).toLocaleString("en-AU")}</p></> : <p className="text-sm leading-6 text-muted-foreground">Generate a CRM-grounded briefing covering priority leads, overdue invoices, today&apos;s work and Google review opportunities.</p>}<div className="mt-5 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}><RefreshCw className={`h-4 w-4 ${generate.isPending ? "animate-spin" : ""}`} /> {data.briefing ? "Refresh" : "Generate"}</Button><Button variant={settings.data?.morningBriefingEnabled ? "default" : "outline"} onClick={() => schedule.mutate({ enabled: !settings.data?.morningBriefingEnabled })} disabled={schedule.isPending}>{settings.data?.morningBriefingEnabled ? "Daily 6am: On" : "Enable daily 6am"}</Button></div></CardContent></Card>

      <Card className="engine-card border-0"><CardHeader className="border-b border-border/70 pb-3"><CardTitle className="font-display text-lg uppercase">Pipeline</CardTitle></CardHeader><CardContent className="space-y-3 p-5">{LEAD_STAGES.map(stage => { const count = data.stageCounts[stage] ?? 0; return <div key={stage}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold text-foreground/80">{stage}</span><span className="font-display font-bold text-white">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(count ? 8 : 0, (count / maxStage) * 100)}%` }} /></div></div>; })}</CardContent></Card>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <Card className="engine-card border-0"><CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/70 pb-3"><CardTitle className="flex items-center gap-2 font-display text-lg uppercase"><CalendarDays className="h-4 w-4 text-primary" /> Upcoming work</CardTitle><Link href="/calendar" className="text-xs font-semibold text-primary hover:text-white">Open calendar</Link></CardHeader><CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{data.upcomingJobs.length ? data.upcomingJobs.map(job => <div key={job.id} className="rounded-xl border border-border/70 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{job.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(job.scheduledStart).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div><div className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">Scheduled</div></div>{job.revenueCents > 0 ? <p className="mt-3 font-display text-lg font-bold text-emerald-400">{money.format(job.revenueCents / 100)}</p> : null}</div>) : <div className="col-span-full p-5 text-center text-sm text-muted-foreground">No scheduled jobs yet. Add work from a client profile or the calendar.</div>}</CardContent></Card>
      <Card className="engine-card border-0"><CardHeader className="pb-3"><CardTitle className="font-display text-lg uppercase">Checklist feed</CardTitle></CardHeader><CardContent><div className={`mb-3 h-2 w-2 rounded-full ${settings.data?.sheetsSyncEnabled ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.6)]" : "bg-amber-400"}`} /><p className="font-semibold text-white">{settings.data?.sheetsSyncEnabled ? "Webhook connected" : "Awaiting first webhook"}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{settings.data?.sheetsWebhookLastReceivedAt ? `Last lead received ${new Date(settings.data.sheetsWebhookLastReceivedAt).toLocaleString("en-AU")}` : "The signed Google Apps Script webhook is ready for configuration."}</p></CardContent></Card>
    </section>
  </div>;
}
