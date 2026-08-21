import { InvoiceFormDialog } from "@/components/crm/InvoiceFormDialog";
import { JobFormDialog } from "@/components/crm/JobFormDialog";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CalendarPlus, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

export default function ClientDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const [jobOpen, setJobOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const detail = trpc.clients.get.useQuery({ id });

  if (detail.isLoading) return <Skeleton className="h-[700px] rounded-2xl" />;
  if (!detail.data) return <div className="engine-card rounded-2xl p-8">Client not found.</div>;

  const { client, jobs, invoices, financials, leadOrigin } = detail.data;
  const stageProgression = leadOrigin?.timeline.filter(item => item.type === "stage_change").slice().reverse() ?? [];

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={() => setLocation("/clients")}>
        <ArrowLeft className="h-4 w-4" /> All clients
      </Button>

      <PageIntro
        eyebrow="Client profile"
        title={client.businessName}
        description={`${client.contactName || "Contact not set"} · ${client.suburb || "Location not set"}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
              <FilePlus2 className="h-4 w-4" /> Add invoice
            </Button>
            <Button onClick={() => setJobOpen(true)}>
              <CalendarPlus className="h-4 w-4" /> Add job
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Paid revenue" value={money.format(financials.revenueCents / 100)} />
        <Metric label="Outstanding" value={money.format(financials.outstandingCents / 100)} />
        <Metric label="Job costs" value={money.format(financials.jobCostCents / 100)} />
        <Metric label="Margin" value={money.format(financials.marginCents / 100)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="engine-card border-0">
          <CardContent className="space-y-5 p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Service summary</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{client.serviceSummary || "No service summary recorded."}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Client notes</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{client.notes || "No client notes recorded."}</p>
            </div>
            <div className="grid gap-3 border-t border-border/60 pt-4 text-sm">
              <p><span className="text-muted-foreground">Billing email:</span> {client.billingEmail || client.email || "—"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {client.phone || "—"}</p>
              <p><span className="text-muted-foreground">ABN:</span> {client.abn || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="engine-card border-0">
          <CardContent className="p-0">
            <div className="border-b border-border/60 px-5 py-4"><h2 className="font-display text-xl font-bold uppercase">Job history</h2></div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Revenue</TableHead><TableHead>Costs</TableHead><TableHead>Margin</TableHead></TableRow></TableHeader>
                <TableBody>
                  {jobs.map(job => {
                    const costs = job.labourCostCents + job.materialCostCents + job.otherCostCents;
                    return <TableRow key={job.id}><TableCell className="font-semibold text-white">{job.title}</TableCell><TableCell>{new Date(job.scheduledStart).toLocaleDateString("en-AU")}</TableCell><TableCell><Badge variant="outline">{job.status}</Badge></TableCell><TableCell>{money.format(job.revenueCents / 100)}</TableCell><TableCell>{money.format(costs / 100)}</TableCell><TableCell className={job.revenueCents - costs >= 0 ? "text-emerald-400" : "text-rose-400"}>{money.format((job.revenueCents - costs) / 100)}</TableCell></TableRow>;
                  })}
                  {jobs.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No jobs recorded.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {leadOrigin ? (
        <section className="grid gap-4 xl:grid-cols-[.75fr_1.25fr]">
          <div className="engine-card rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Originating lead</p>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase text-white">{leadOrigin.lead.businessName}</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <p><span className="text-muted-foreground">Source:</span> {leadOrigin.lead.source}</p>
              <p><span className="text-muted-foreground">Checklist:</span> {leadOrigin.lead.checklistScore ?? "—"} {leadOrigin.lead.tier ? `· ${leadOrigin.lead.tier}` : ""}</p>
              <p><span className="text-muted-foreground">Current stage:</span> {leadOrigin.lead.stage}</p>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Stage progression</p>
                <div className="flex flex-wrap items-center gap-2">
                  {stageProgression.length ? stageProgression.map(item => <Badge key={item.id} variant="outline" className="border-primary/25 text-primary">{item.body}</Badge>) : <Badge variant="outline">Current: {leadOrigin.lead.stage}</Badge>}
                </div>
              </div>
              <p className="whitespace-pre-wrap leading-6 text-muted-foreground">{leadOrigin.lead.notes || "No originating lead notes."}</p>
            </div>
          </div>

          <div className="engine-card rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold uppercase">Lead history</h2><span className="text-xs text-muted-foreground">{leadOrigin.timeline.length} entries</span></div>
            <div className="mt-4 space-y-2">
              {leadOrigin.timeline.map(item => <div key={item.id} className="rounded-xl border border-border/60 bg-black/10 p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold capitalize text-white">{item.subject || item.type.replace("_", " ")}</p><time className="text-[10px] text-muted-foreground">{new Date(item.occurredAt).toLocaleString("en-AU")}</time></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.body}</p></div>)}
              {leadOrigin.timeline.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No originating lead interactions.</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="engine-card overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 px-5 py-4"><h2 className="font-display text-xl font-bold uppercase">Invoice history</h2></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Sent</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map(invoice => <TableRow key={invoice.id}><TableCell className="font-semibold text-white">{invoice.invoiceNumber}</TableCell><TableCell>{money.format(invoice.amountCents / 100)}</TableCell><TableCell>{invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString("en-AU") : "—"}</TableCell><TableCell>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("en-AU") : "—"}</TableCell><TableCell><Badge variant="outline">{invoice.status}</Badge></TableCell></TableRow>)}
              {invoices.length === 0 ? <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No invoices recorded.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <JobFormDialog open={jobOpen} onOpenChange={setJobOpen} clientId={id} />
      <InvoiceFormDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} clients={[{ id: client.id, businessName: client.businessName }]} fixedClientId={id} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="engine-card rounded-2xl p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-extrabold text-white">{value}</p></div>;
}
