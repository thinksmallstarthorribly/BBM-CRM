import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, Building2, Clipboard, Mail, MessageSquareText, Phone, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Suggestion = { recommendedAction: string; suggestedMessage: string; urgency: "low" | "medium" | "high"; rationale: string };

export function LeadDetailDialog({ leadId, onOpenChange }: { leadId: number | null; onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const [note, setNote] = useState("");
  const [type, setType] = useState<"note" | "call" | "email" | "meeting" | "quote">("note");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const utils = trpc.useUtils();
  const detail = trpc.leads.get.useQuery({ id: leadId ?? 0 }, { enabled: Boolean(leadId) });

  const add = trpc.leads.addInteraction.useMutation({
    onSuccess: async () => { setNote(""); toast.success("Interaction logged"); if (leadId) await Promise.all([utils.leads.get.invalidate({ id: leadId }), utils.leads.timeline.invalidate()]); },
    onError: error => toast.error(error.message),
  });
  const convert = trpc.clients.convertLead.useMutation({
    onSuccess: async result => { toast.success("Client profile ready"); await Promise.all([utils.clients.list.invalidate(), utils.leads.list.invalidate(), utils.dashboard.summary.invalidate()]); onOpenChange(false); if (result.id) setLocation(`/clients/${result.id}`); },
    onError: error => toast.error(error.message),
  });
  const score = trpc.ai.scoreLead.useMutation({
    onSuccess: async result => { toast.success(`AI lead score: ${result.score}`); if (leadId) await Promise.all([utils.leads.get.invalidate({ id: leadId }), utils.leads.list.invalidate(), utils.dashboard.summary.invalidate()]); },
    onError: error => toast.error(error.message),
  });
  const followUp = trpc.ai.suggestFollowUp.useMutation({
    onSuccess: result => setSuggestion(result),
    onError: error => toast.error(error.message),
  });

  const logInteraction = () => {
    if (leadId && note.trim()) add.mutate({ leadId, type, body: note.trim() });
  };

  return (
    <Dialog open={Boolean(leadId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {detail.isLoading ? <Skeleton className="h-[620px]" /> : detail.data ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2"><DialogTitle className="font-display text-3xl uppercase">{detail.data.lead.businessName}</DialogTitle><Badge variant="outline" className="border-primary/30 text-primary">{detail.data.lead.stage}</Badge></div>
              <DialogDescription>{detail.data.lead.contactName || "No contact name"} · {detail.data.lead.suburb || "Suburb not set"}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 rounded-xl border bg-black/10 p-4 text-sm sm:grid-cols-3">
              <a href={detail.data.lead.phone ? `tel:${detail.data.lead.phone}` : undefined} className="flex items-center gap-2 text-muted-foreground hover:text-primary"><Phone className="h-4 w-4" />{detail.data.lead.phone || "No phone"}</a>
              <a href={detail.data.lead.email ? `mailto:${detail.data.lead.email}` : undefined} className="flex items-center gap-2 text-muted-foreground hover:text-primary"><Mail className="h-4 w-4" />{detail.data.lead.email || "No email"}</a>
              <div className="flex items-center gap-2 text-muted-foreground"><MessageSquareText className="h-4 w-4" />Score {detail.data.lead.aiLeadScore ?? detail.data.lead.checklistScore ?? "—"}</div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/[.035] p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary"><BrainCircuit className="h-3.5 w-3.5" /> AI lead engine</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail.data.lead.aiScoreReason || "Score this lead from checklist, Google review and interaction signals, then generate the next follow-up."}</p></div>
                <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => leadId && score.mutate({ leadId })} disabled={score.isPending}>{score.isPending ? "Scoring..." : "Score lead"}</Button><Button size="sm" onClick={() => leadId && followUp.mutate({ leadId })} disabled={followUp.isPending}><Sparkles className="h-3.5 w-3.5" />{followUp.isPending ? "Thinking..." : "Suggest follow-up"}</Button></div>
              </div>
              {suggestion ? <div className="mt-4 rounded-xl border border-border/70 bg-background/50 p-4"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className={suggestion.urgency === "high" ? "border-rose-400/30 text-rose-400" : suggestion.urgency === "medium" ? "border-amber-400/30 text-amber-400" : "border-primary/30 text-primary"}>{suggestion.urgency} urgency</Badge><p className="mt-2 font-semibold text-white">{suggestion.recommendedAction}</p></div><Button size="icon" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(suggestion.suggestedMessage); toast.success("Suggested message copied"); }} aria-label="Copy suggested message"><Clipboard className="h-4 w-4" /></Button></div><p className="mt-3 whitespace-pre-wrap rounded-lg bg-black/15 p-3 text-sm leading-6">{suggestion.suggestedMessage}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{suggestion.rationale}</p></div> : null}
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{detail.data.lead.notes || "No lead notes yet."}</p></div>{detail.data.lead.stage !== "Lost" ? <Button size="sm" variant="outline" onClick={() => leadId && convert.mutate({ leadId })} disabled={convert.isPending}><Building2 className="h-4 w-4" /> {detail.data.lead.stage === "Active Client" ? "Open client" : "Make client"}</Button> : null}</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-display text-xl font-bold uppercase">Interaction timeline</h3><span className="text-xs text-muted-foreground">{detail.data.timeline.length} entries</span></div>
              <div className="flex flex-col gap-2 sm:flex-row"><Select value={type} onValueChange={value => setType(value as typeof type)}><SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Note</SelectItem><SelectItem value="call">Call</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="quote">Quote</SelectItem></SelectContent></Select><Input value={note} onChange={event => setNote(event.target.value)} placeholder="Log a call, email, note or meeting..." onKeyDown={event => { if (event.key === "Enter") logInteraction(); }} /><Button onClick={logInteraction} disabled={!note.trim() || add.isPending}><Plus className="h-4 w-4" /> Log</Button></div>
              <div className="space-y-2">{detail.data.timeline.length ? detail.data.timeline.map(item => <div key={item.id} className="flex gap-3 rounded-xl border border-border/60 bg-black/10 p-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold capitalize text-white">{item.subject || item.type.replace("_", " ")}</p><p className="text-[10px] text-muted-foreground">{new Date(item.occurredAt).toLocaleString("en-AU")}</p></div><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{item.body}</p></div></div>) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No interactions logged yet.</p>}</div>
            </div>
          </>
        ) : <p className="p-8 text-center text-muted-foreground">Lead could not be loaded.</p>}
      </DialogContent>
    </Dialog>
  );
}
