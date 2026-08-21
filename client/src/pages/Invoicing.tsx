import { InvoiceFormDialog } from "@/components/crm/InvoiceFormDialog";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { FilePlus2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
export default function Invoicing() {
  const [formOpen, setFormOpen] = useState(false);
  const invoices = trpc.finance.listInvoices.useQuery();
  const clients = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.finance.updateInvoiceStatus.useMutation({ onSuccess: async () => { toast.success("Invoice status updated"); await Promise.all([utils.finance.listInvoices.invalidate(), utils.finance.overview.invalidate(), utils.dashboard.summary.invalidate()]); }, onError: error => toast.error(error.message) });
  const outstanding = invoices.data?.filter(item => ["sent", "outstanding", "overdue"].includes(item.status)).reduce((sum, item) => sum + item.amountCents, 0) ?? 0;
  const paid = invoices.data?.filter(item => item.status === "paid").reduce((sum, item) => sum + item.amountCents, 0) ?? 0;
  return <div className="space-y-5"><PageIntro eyebrow="Accounts engine" title="Invoicing" description="Track invoice number, amount, sent date and paid or outstanding status without losing the client context." actions={<Button onClick={() => setFormOpen(true)} disabled={!clients.data?.length}><FilePlus2 className="h-4 w-4" /> Add invoice</Button>} /><div className="grid gap-3 sm:grid-cols-3"><Metric label="All invoices" value={invoices.data?.length.toString() ?? "0"} /><Metric label="Outstanding" value={money.format(outstanding / 100)} /><Metric label="Paid revenue" value={money.format(paid / 100)} /></div><div className="engine-card overflow-hidden rounded-2xl">{invoices.isLoading ? <Skeleton className="h-[500px]" /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Amount</TableHead><TableHead>Sent date</TableHead><TableHead>Due date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{invoices.data?.map(invoice => <TableRow key={invoice.id}><TableCell className="font-semibold text-white">{invoice.invoiceNumber}</TableCell><TableCell>{invoice.clientName}</TableCell><TableCell>{money.format(invoice.amountCents / 100)}</TableCell><TableCell>{invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString("en-AU") : "—"}</TableCell><TableCell>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("en-AU") : "—"}</TableCell><TableCell><Select value={invoice.status} onValueChange={status => update.mutate({ id: invoice.id, status: status as typeof invoice.status })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="outstanding">Outstanding</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="void">Void</SelectItem></SelectContent></Select></TableCell></TableRow>)}{invoices.data?.length === 0 ? <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">No invoices recorded. Add a client first, then create the first invoice.</TableCell></TableRow> : null}</TableBody></Table></div>}</div><InvoiceFormDialog open={formOpen} onOpenChange={setFormOpen} clients={clients.data ?? []} /></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="engine-card rounded-2xl p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-extrabold text-white">{value}</p></div>; }
