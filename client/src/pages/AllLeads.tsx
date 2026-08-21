import { LeadDetailDialog } from "@/components/crm/LeadDetailDialog";
import { EditableLead, LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { LEAD_STAGES, type LeadStage } from "@shared/crm";
import { Eye, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function AllLeads() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<LeadStage | "all">("all");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editLead, setEditLead] = useState<EditableLead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const input = useMemo(() => ({ search: search || undefined, stage: stage === "all" ? undefined : stage }), [search, stage]);
  const leads = trpc.leads.list.useQuery(input);
  return <div className="space-y-5"><PageIntro eyebrow="Pipeline database" title="All Leads" description="Search, filter, inspect and edit every commercial opportunity from one persistent register." actions={<Button onClick={() => { setEditLead(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add lead</Button>} /><div className="engine-card flex flex-col gap-3 rounded-2xl p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search business, contact, email or suburb..." className="pl-9" /></div><Select value={stage} onValueChange={value => setStage(value as LeadStage | "all")}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{LEAD_STAGES.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="engine-card overflow-hidden rounded-2xl">{leads.isLoading ? <Skeleton className="h-[460px]" /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Contact</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead><TableHead>Source</TableHead><TableHead>Next action</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{leads.data?.map(lead => <TableRow key={lead.id}><TableCell><p className="font-semibold text-white">{lead.businessName}</p><p className="text-xs text-muted-foreground">{lead.suburb || lead.businessType || "—"}</p></TableCell><TableCell><p>{lead.contactName || "—"}</p><p className="text-xs text-muted-foreground">{lead.email || lead.phone || "No details"}</p></TableCell><TableCell><Badge variant="outline" className="border-primary/25 text-primary">{lead.stage}</Badge></TableCell><TableCell className="font-display text-lg font-bold">{lead.aiLeadScore ?? lead.checklistScore ?? "—"}</TableCell><TableCell className="max-w-48 truncate text-muted-foreground">{lead.source}</TableCell><TableCell className="max-w-64"><p className="truncate">{lead.nextAction || "Not set"}</p>{lead.nextActionAt ? <p className="text-xs text-muted-foreground">{new Date(lead.nextActionAt).toLocaleDateString("en-AU")}</p> : null}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => setDetailId(lead.id)} aria-label={`View ${lead.businessName}`}><Eye className="h-4 w-4"/></Button><Button size="icon" variant="ghost" onClick={() => { setEditLead(lead as EditableLead); setFormOpen(true); }} aria-label={`Edit ${lead.businessName}`}><Pencil className="h-4 w-4"/></Button></div></TableCell></TableRow>)}{leads.data?.length === 0 ? <TableRow><TableCell colSpan={7} className="h-40 text-center text-muted-foreground">No leads match this view.</TableCell></TableRow> : null}</TableBody></Table></div>}</div><LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editLead} /><LeadDetailDialog leadId={detailId} onOpenChange={open => !open && setDetailId(null)} /></div>;
}
