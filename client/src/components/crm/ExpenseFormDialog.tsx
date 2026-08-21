import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ClientOption = { id: number; businessName: string };
const categories = ["Labour", "Chemicals & Consumables", "Equipment", "Vehicle & Fuel", "Insurance", "Marketing", "Software", "Professional Fees", "Other"];

export function ExpenseFormDialog({ open, onOpenChange, clients }: { open: boolean; onOpenChange: (open: boolean) => void; clients: ClientOption[] }) {
  const [form, setForm] = useState({ clientId: "none", category: categories[0], vendor: "", description: "", amount: "", incurredAt: "", notes: "" });
  const utils = trpc.useUtils();
  useEffect(() => { if (open) setForm({ clientId: "none", category: categories[0], vendor: "", description: "", amount: "", incurredAt: new Date().toISOString().slice(0, 10), notes: "" }); }, [open]);
  const create = trpc.finance.createExpense.useMutation({ onSuccess: async () => { toast.success("Expense recorded"); await Promise.all([utils.finance.listExpenses.invalidate(), utils.finance.overview.invalidate(), utils.finance.trend.invalidate()]); onOpenChange(false); }, onError: error => toast.error(error.message) });
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = () => create.mutate({ clientId: form.clientId === "none" ? null : Number(form.clientId), category: form.category, vendor: form.vendor.trim() || null, description: form.description.trim(), amountCents: Math.round(Number(form.amount) * 100), incurredAt: new Date(`${form.incurredAt}T00:00:00`), taxDeductible: true, notes: form.notes.trim() || null });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="font-display text-2xl uppercase">Record expense</DialogTitle><DialogDescription>Add a real business cost to the profit and loss engine.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={value => set("category", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Client allocation</Label><Select value={form.clientId} onValueChange={value => set("clientId", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">General business</SelectItem>{clients.map(client => <SelectItem key={client.id} value={client.id.toString()}>{client.businessName}</SelectItem>)}</SelectContent></Select></div><Field label="Vendor" value={form.vendor} onChange={value => set("vendor", value)} /><Field label="Date" type="date" value={form.incurredAt} onChange={value => set("incurredAt", value)} /><div className="space-y-2 sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={event => set("description", event.target.value)} placeholder="What was purchased?" /></div><Field label="Amount (AUD)" type="number" value={form.amount} onChange={value => set("amount", value)} /><div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={event => set("notes", event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!form.description.trim() || !(Number(form.amount) > 0) || !form.incurredAt || create.isPending}>{create.isPending ? "Saving..." : "Record expense"}</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={event => onChange(event.target.value)} /></div>; }
