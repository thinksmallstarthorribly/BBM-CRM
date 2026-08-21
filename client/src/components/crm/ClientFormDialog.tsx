import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const empty = { businessName: "", contactName: "", email: "", phone: "", billingEmail: "", address: "", suburb: "", abn: "", serviceSummary: "", notes: "", startedAt: "" };

export function ClientFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState(empty);
  const utils = trpc.useUtils();
  useEffect(() => { if (open) setForm(empty); }, [open]);
  const create = trpc.clients.create.useMutation({ onSuccess: async () => { toast.success("Client created"); await Promise.all([utils.clients.list.invalidate(), utils.dashboard.summary.invalidate()]); onOpenChange(false); }, onError: error => toast.error(error.message) });
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => create.mutate({ businessName: form.businessName.trim(), contactName: form.contactName.trim() || null, email: form.email.trim() || null, phone: form.phone.trim() || null, billingEmail: form.billingEmail.trim() || null, address: form.address.trim() || null, suburb: form.suburb.trim() || null, abn: form.abn.trim() || null, serviceSummary: form.serviceSummary.trim() || null, notes: form.notes.trim() || null, startedAt: form.startedAt ? new Date(`${form.startedAt}T00:00:00`) : null, status: "active" });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="font-display text-2xl uppercase">Add client</DialogTitle><DialogDescription>Create a persistent client profile for a live cleaning account.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Business name" value={form.businessName} onChange={value => set("businessName", value)} /><Field label="Contact name" value={form.contactName} onChange={value => set("contactName", value)} /><Field label="Email" type="email" value={form.email} onChange={value => set("email", value)} /><Field label="Phone" value={form.phone} onChange={value => set("phone", value)} /><Field label="Billing email" type="email" value={form.billingEmail} onChange={value => set("billingEmail", value)} /><Field label="ABN" value={form.abn} onChange={value => set("abn", value)} /><Field label="Address" value={form.address} onChange={value => set("address", value)} /><Field label="Suburb" value={form.suburb} onChange={value => set("suburb", value)} /><Field label="Client since" type="date" value={form.startedAt} onChange={value => set("startedAt", value)} /><div className="space-y-2 sm:col-span-2"><Label>Service summary</Label><Textarea rows={3} value={form.serviceSummary} onChange={event => set("serviceSummary", event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea rows={4} value={form.notes} onChange={event => set("notes", event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!form.businessName.trim() || create.isPending}>{create.isPending ? "Saving..." : "Create client"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={event => onChange(event.target.value)} /></div>; }
