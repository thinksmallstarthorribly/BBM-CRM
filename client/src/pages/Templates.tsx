import { PageIntro } from "@/components/crm/PageIntro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Mail, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Templates() {
  const templates = trpc.workspace.templates.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = templates.data?.find(item => item.id === selectedId);
  const [form, setForm] = useState({ name: "", category: "Follow-up", subject: "", body: "" });
  useEffect(() => { if (selected) setForm({ name: selected.name, category: selected.category, subject: selected.subject ?? "", body: selected.body }); }, [selected]);
  const save = trpc.workspace.saveTemplate.useMutation({ onSuccess: async result => { toast.success("Template saved"); setSelectedId(result.id ?? null); await utils.workspace.templates.invalidate(); }, onError: error => toast.error(error.message) });
  const reset = () => { setSelectedId(null); setForm({ name: "", category: "Follow-up", subject: "", body: "" }); };
  return <div className="space-y-5"><PageIntro eyebrow="Follow-up engine" title="Email Templates" description="Build reusable commercial follow-ups without hard-coding messages into the application." actions={<Button onClick={reset}><Plus className="h-4 w-4" /> New template</Button>} /><div className="grid gap-4 lg:grid-cols-[300px_1fr]"><div className="engine-card overflow-hidden rounded-2xl">{templates.isLoading ? <Skeleton className="h-[560px]" /> : <div className="divide-y divide-border/60">{templates.data?.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full p-4 text-left hover:bg-white/[.025] ${selectedId === item.id ? "bg-primary/[.07]" : ""}`}><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Mail className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.category}</p></div></div></button>)}{templates.data?.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No templates yet.</p> : null}</div>}</div><div className="engine-card rounded-2xl p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Template name</Label><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Quote follow-up" /></div><div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} /></div><div className="space-y-2 sm:col-span-2"><Label>Subject</Label><Input value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))} placeholder="Quick follow-up on your cleaning quote" /></div><div className="space-y-2 sm:col-span-2"><Label>Message</Label><Textarea value={form.body} onChange={event => setForm(current => ({ ...current, body: event.target.value }))} rows={15} placeholder="Write the template here. Use clear placeholders such as [CONTACT NAME] and [BUSINESS NAME]." /></div></div><div className="mt-5 flex justify-end"><Button disabled={!form.name.trim() || !form.body.trim() || save.isPending} onClick={() => save.mutate({ id: selectedId ?? undefined, name: form.name.trim(), category: form.category.trim() || "Follow-up", subject: form.subject.trim() || null, body: form.body.trim(), isActive: true })}>{save.isPending ? "Saving..." : "Save template"}</Button></div></div></div></div>;
}
