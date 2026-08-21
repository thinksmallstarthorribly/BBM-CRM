import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadDetailDialog } from "@/components/crm/LeadDetailDialog";
import { EditableLead, LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { PageIntro } from "@/components/crm/PageIntro";
import { trpc } from "@/lib/trpc";
import { LEAD_STAGES, type LeadStage } from "@shared/crm";
import { GripVertical, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LeadPipeline() {
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<EditableLead | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const leads = trpc.leads.list.useQuery(undefined);
  const utils = trpc.useUtils();
  const move = trpc.leads.moveStage.useMutation({ onSuccess: async () => { await Promise.all([utils.leads.list.invalidate(), utils.dashboard.summary.invalidate()]); }, onError: error => toast.error(error.message) });
  if (leads.isLoading) return <div className="grid gap-3 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[540px] rounded-2xl" />)}</div>;
  const all = leads.data ?? [];
  return <div className="space-y-5"><PageIntro eyebrow="Lead pipeline engine" title="Lead Lifecycle" description="Drag businesses through the exact Big Blue Mop lifecycle. Every move is stored in the interaction timeline." actions={<Button onClick={() => { setEditLead(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add lead</Button>} /><div className="-mx-3 overflow-x-auto px-3 pb-3"><div className="flex min-w-max gap-3">{LEAD_STAGES.map(stage => { const stageLeads = all.filter(lead => lead.stage === stage); return <section key={stage} className="engine-card w-[288px] rounded-2xl" onDragOver={event => event.preventDefault()} onDrop={() => { if (dragId) move.mutate({ id: dragId, stage }); setDragId(null); }}><div className="flex items-center justify-between border-b border-border/70 px-4 py-3"><h2 className="font-display text-base font-bold uppercase text-white">{stage}</h2><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 font-display text-xs font-bold text-primary">{stageLeads.length}</span></div><div className="min-h-[420px] space-y-2 p-2.5">{stageLeads.map(lead => <article key={lead.id} draggable onDragStart={() => setDragId(lead.id)} onDragEnd={() => setDragId(null)} className="group rounded-xl border border-border/70 bg-black/10 p-3.5 hover:border-primary/45 hover:bg-primary/[.035]"><div className="flex items-start gap-2"><GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50"/><button onClick={() => setDetailId(lead.id)} className="min-w-0 flex-1 text-left"><p className="truncate font-semibold text-white group-hover:text-primary">{lead.businessName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{lead.contactName || lead.businessType || "Contact not set"}</p></button><button onClick={() => { setEditLead(lead as EditableLead); setFormOpen(true); }} aria-label={`Edit ${lead.businessName}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5"/></button></div><div className="mt-3 flex flex-wrap gap-1.5">{lead.checklistScore != null ? <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Score {lead.checklistScore}</span> : null}{lead.tier ? <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">{lead.tier}</span> : null}</div><div className="mt-3 flex items-center gap-3 text-muted-foreground">{lead.phone ? <Phone className="h-3.5 w-3.5" /> : null}{lead.email ? <Mail className="h-3.5 w-3.5" /> : null}{lead.suburb ? <span className="flex items-center gap-1 text-[10px]"><MapPin className="h-3.5 w-3.5" />{lead.suburb}</span> : null}</div></article>)}{stageLeads.length === 0 ? <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground">Drop a lead here</div> : null}</div></section>; })}</div></div><LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editLead} /><LeadDetailDialog leadId={detailId} onOpenChange={open => !open && setDetailId(null)} /></div>;
}
