import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function localDateTime(date: Date) { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }
const dollars = (value: string) => Math.round((Number(value) || 0) * 100);

export function JobFormDialog({ open, onOpenChange, clientId }: { open: boolean; onOpenChange: (open: boolean) => void; clientId: number }) {
  const [form, setForm] = useState({ title: "Commercial clean", status: "scheduled", start: "", end: "", revenue: "", labour: "", materials: "", other: "", notes: "" });
  const utils = trpc.useUtils();
  useEffect(() => { if (open) { const start = new Date(); start.setHours(start.getHours() + 1, 0, 0, 0); const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); setForm({ title: "Commercial clean", status: "scheduled", start: localDateTime(start), end: localDateTime(end), revenue: "", labour: "", materials: "", other: "", notes: "" }); } }, [open]);
  const create = trpc.clients.createJob.useMutation({ onSuccess: async () => { toast.success("Job saved"); await Promise.all([utils.clients.get.invalidate({ id: clientId }), utils.clients.calendar.invalidate(), utils.dashboard.summary.invalidate()]); onOpenChange(false); }, onError: error => toast.error(error.message) });
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => create.mutate({ clientId, title: form.title.trim(), status: form.status as "scheduled" | "completed" | "cancelled", scheduledStart: new Date(form.start), scheduledEnd: form.end ? new Date(form.end) : null, completedAt: form.status === "completed" ? new Date(form.end || form.start) : null, revenueCents: dollars(form.revenue), labourCostCents: dollars(form.labour), materialCostCents: dollars(form.materials), otherCostCents: dollars(form.other), notes: form.notes.trim() || null });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="font-display text-2xl uppercase">Add client job</DialogTitle><DialogDescription>Schedule work and capture the revenue and actual delivery costs.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Job title</Label><Input value={form.title} onChange={event => set("title", event.target.value)} /></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={value => set("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div><div/><Field label="Start" type="datetime-local" value={form.start} onChange={value => set("start", value)} /><Field label="End" type="datetime-local" value={form.end} onChange={value => set("end", value)} /><Field label="Revenue (AUD)" type="number" value={form.revenue} onChange={value => set("revenue", value)} /><Field label="Labour cost" type="number" value={form.labour} onChange={value => set("labour", value)} /><Field label="Materials cost" type="number" value={form.materials} onChange={value => set("materials", value)} /><Field label="Other cost" type="number" value={form.other} onChange={value => set("other", value)} /><div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={event => set("notes", event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!form.title.trim() || !form.start || create.isPending}>{create.isPending ? "Saving..." : "Save job"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={event => onChange(event.target.value)} /></div>; }
