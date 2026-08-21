import { ClientFormDialog } from "@/components/crm/ClientFormDialog";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Building2, Mail, MapPin, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Clients() {
  const clients = trpc.clients.list.useQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [, setLocation] = useLocation();
  return <div className="space-y-5"><PageIntro eyebrow="Client operations" title="Clients" description="Every active cleaning account, its job history, costs, invoices and financial position." actions={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add client</Button>} />{clients.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div> : clients.data?.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{clients.data.map(client => <article key={client.id} className="engine-card rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5"/></div><Badge variant="outline" className={client.status === "active" ? "border-emerald-400/30 text-emerald-400" : ""}>{client.status}</Badge></div><h2 className="mt-4 font-display text-2xl font-bold uppercase text-white">{client.businessName}</h2><p className="mt-1 text-sm text-muted-foreground">{client.contactName || "Contact not set"}</p><div className="mt-4 space-y-2 text-xs text-muted-foreground">{client.phone ? <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone}</p> : null}{client.email ? <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{client.email}</p> : null}{client.suburb ? <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{client.suburb}</p> : null}</div><Button variant="outline" className="mt-5 w-full" onClick={() => setLocation(`/clients/${client.id}`)}>Open client <ArrowRight className="h-4 w-4" /></Button></article>)}</div> : <div className="engine-card rounded-2xl py-20 text-center"><Building2 className="mx-auto h-9 w-9 text-primary"/><h2 className="mt-4 font-display text-2xl font-bold uppercase">No clients yet</h2><p className="mt-2 text-sm text-muted-foreground">Convert a won lead or create the first client directly.</p><Button className="mt-5" onClick={() => setFormOpen(true)}>Add client</Button></div>}<ClientFormDialog open={formOpen} onOpenChange={setFormOpen} /></div>;
}
