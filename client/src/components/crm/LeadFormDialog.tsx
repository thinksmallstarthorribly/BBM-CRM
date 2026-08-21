import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { LEAD_STAGES, type LeadStage } from "@shared/crm";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type EditableLead = {
  id: number; businessName: string; contactName: string | null; email: string | null; phone: string | null; address: string | null; suburb: string | null; businessType: string | null; stage: LeadStage; checklistScore: number | null; tier: string | null; notes: string | null; source: string; campaignId: number | null;
};

const empty = { businessName: "", contactName: "", email: "", phone: "", address: "", suburb: "", businessType: "", stage: "New" as LeadStage, checklistScore: "", tier: "", notes: "", source: "Manual", campaignId: "none" };

export function LeadFormDialog({ open, onOpenChange, lead }: { open: boolean; onOpenChange: (open: boolean) => void; lead?: EditableLead | null }) {
  const [form, setForm] = useState(empty);
  const campaigns = trpc.workspace.campaigns.useQuery();
  const utils = trpc.useUtils();
  useEffect(() => {
    if (!open) return;
    setForm(lead ? { businessName: lead.businessName, contactName: lead.contactName ?? "", email: lead.email ?? "", phone: lead.phone ?? "", address: lead.address ?? "", suburb: lead.suburb ?? "", businessType: lead.businessType ?? "", stage: lead.stage, checklistScore: lead.checklistScore?.toString() ?? "", tier: lead.tier ?? "", notes: lead.notes ?? "", source: lead.source, campaignId: lead.campaignId?.toString() ?? "none" } : empty);
  }, [open, lead]);
  const finish = async () => { await Promise.all([utils.leads.list.invalidate(), utils.dashboard.summary.invalidate()]); onOpenChange(false); };
  const create = trpc.leads.create.useMutation({ onSuccess: async () => { toast.success("Lead added to the pipeline"); await finish(); }, onError: error => toast.error(error.message) });
  const update = trpc.leads.update.useMutation({ onSuccess: async () => { toast.success("Lead updated"); await finish(); }, onError: error => toast.error(error.message) });
  const busy = create.isPending || update.isPending;
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => {
    const values = { businessName: form.businessName.trim(), contactName: form.contactName.trim() || null, email: form.email.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null, suburb: form.suburb.trim() || null, businessType: form.businessType.trim() || null, stage: form.stage, checklistScore: form.checklistScore ? Number(form.checklistScore) : null, tier: form.tier.trim() || null, notes: form.notes.trim() || null, source: form.source.trim() || "Manual", campaignId: form.campaignId === "none" ? null : Number(form.campaignId) };
    if (!values.businessName) return toast.error("Business name is required");
    if (lead) update.mutate({ id: lead.id, changes: values }); else create.mutate(values);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="font-display text-2xl uppercase">{lead ? "Edit lead" : "Add lead"}</DialogTitle><DialogDescription>{lead ? "Update the business record and pipeline position." : "Create a persistent lead record in the Home of Engines."}</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><Field label="Business name" value={form.businessName} onChange={value => set("businessName", value)} required /><Field label="Contact name" value={form.contactName} onChange={value => set("contactName", value)} /><Field label="Email" type="email" value={form.email} onChange={value => set("email", value)} /><Field label="Phone" value={form.phone} onChange={value => set("phone", value)} /><Field label="Address" value={form.address} onChange={value => set("address", value)} /><Field label="Suburb" value={form.suburb} onChange={value => set("suburb", value)} /><Field label="Business type" value={form.businessType} onChange={value => set("businessType", value)} /><div className="space-y-2"><Label>Pipeline stage</Label><Select value={form.stage} onValueChange={value => set("stage", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent></Select></div><Field label="Checklist score" type="number" value={form.checklistScore} onChange={value => set("checklistScore", value)} /><Field label="Tier" value={form.tier} onChange={value => set("tier", value)} /><Field label="Source" value={form.source} onChange={value => set("source", value)} /><div className="space-y-2"><Label>Campaign</Label><Select value={form.campaignId} onValueChange={value => set("campaignId", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No campaign</SelectItem>{campaigns.data?.map(campaign => <SelectItem key={campaign.id} value={campaign.id.toString()}>{campaign.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={event => set("notes", event.target.value)} rows={5} placeholder="Commercial context, cleaning issues, decision-maker notes..." /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? "Saving..." : lead ? "Save changes" : "Add lead"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-2"><Label>{label}{required ? " *" : ""}</Label><Input type={type} value={value} onChange={event => onChange(event.target.value)} /></div>;
}
