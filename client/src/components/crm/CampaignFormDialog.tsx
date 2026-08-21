import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function CampaignFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState({ name: "", channel: "Website", sourceCode: "", status: "active", spend: "", startedAt: "", notes: "" });
  const utils = trpc.useUtils();
  useEffect(() => { if (open) setForm({ name: "", channel: "Website", sourceCode: "", status: "active", spend: "", startedAt: new Date().toISOString().slice(0, 10), notes: "" }); }, [open]);
  const save = trpc.workspace.saveCampaign.useMutation({ onSuccess: async () => { toast.success("Campaign saved"); await utils.workspace.campaigns.invalidate(); onOpenChange(false); }, onError: error => toast.error(error.message) });
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => save.mutate({ name: form.name.trim(), channel: form.channel.trim(), sourceCode: form.sourceCode.trim(), status: form.status as "planned" | "active" | "paused" | "completed", spendCents: Math.round((Number(form.spend) || 0) * 100), startedAt: form.startedAt ? new Date(`${form.startedAt}T00:00:00`) : null, notes: form.notes.trim() || null });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="font-display text-2xl uppercase">Add campaign</DialogTitle><DialogDescription>Create an attribution source that can be assigned to leads.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Campaign name" value={form.name} onChange={value => set("name", value)} /><Field label="Channel" value={form.channel} onChange={value => set("channel", value)} /><Field label="Source code" value={form.sourceCode} onChange={value => set("sourceCode", value)} /><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={value => set("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div><Field label="Spend (AUD)" type="number" value={form.spend} onChange={value => set("spend", value)} /><Field label="Start date" type="date" value={form.startedAt} onChange={value => set("startedAt", value)} /><div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={event => set("notes", event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!form.name.trim() || !form.channel.trim() || !form.sourceCode.trim() || save.isPending}>{save.isPending ? "Saving..." : "Save campaign"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={event => onChange(event.target.value)} /></div>; }
