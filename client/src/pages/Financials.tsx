import { ExpenseFormDialog } from "@/components/crm/ExpenseFormDialog";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Plus, Scale, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Period = "month" | "quarter" | "year";
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export default function Financials() {
  const [period, setPeriod] = useState<Period>("month");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const overview = trpc.finance.overview.useQuery({ period });
  const trend = trpc.finance.trend.useQuery();
  const expenses = trpc.finance.listExpenses.useQuery();
  const clients = trpc.clients.list.useQuery();
  const loading = overview.isLoading || trend.isLoading || expenses.isLoading;
  const chartData = trend.data?.map(item => ({ ...item, Revenue: item.revenueCents / 100, Expenses: item.expenseCents / 100 })) ?? [];
  const categories = useMemo(() => Array.from(new Set((expenses.data ?? []).map(item => item.category))).sort(), [expenses.data]);
  const filteredExpenses = useMemo(() => {
    const start = overview.data ? new Date(overview.data.start).getTime() : Number.NEGATIVE_INFINITY;
    const end = overview.data ? new Date(overview.data.end).getTime() : Number.POSITIVE_INFINITY;
    const search = expenseSearch.trim().toLowerCase();
    return (expenses.data ?? []).filter(item => {
      const time = new Date(item.incurredAt).getTime();
      const matchesPeriod = time >= start && time <= end;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const haystack = `${item.description} ${item.vendor ?? ""} ${item.clientName ?? ""}`.toLowerCase();
      return matchesPeriod && matchesCategory && (!search || haystack.includes(search));
    });
  }, [categoryFilter, expenseSearch, expenses.data, overview.data]);
  const filteredExpenseTotal = filteredExpenses.reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Financial tracking"
        title="Financials"
        description="Revenue, expenses, outstanding invoices and profit or loss from the actual CRM records."
        actions={<Button onClick={() => setExpenseOpen(true)}><Plus className="h-4 w-4" /> Record expense</Button>}
      />

      <div className="engine-card inline-flex rounded-xl p-1">
        {(["month", "quarter", "year"] as Period[]).map(item => (
          <button key={item} onClick={() => setPeriod(item)} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide ${period === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"}`}>
            {item === "month" ? "Monthly" : item === "quarter" ? "Quarterly" : "Yearly"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}</div>
      ) : overview.data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Revenue" value={money.format(overview.data.revenueCents / 100)} icon={ArrowUpRight} tone="green" />
            <Metric label="Expenses" value={money.format(overview.data.expenseCents / 100)} icon={ArrowDownRight} tone="red" />
            <Metric label="Profit / loss" value={money.format(overview.data.profitCents / 100)} icon={Scale} tone={overview.data.profitCents >= 0 ? "blue" : "red"} />
            <Metric label="Outstanding" value={money.format(overview.data.outstandingCents / 100)} icon={CircleDollarSign} tone="amber" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
            <Card className="engine-card border-0">
              <CardHeader><CardTitle className="font-display text-xl uppercase">Twelve-month revenue vs expenses</CardTitle></CardHeader>
              <CardContent className="h-[310px] p-2 sm:p-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#34434f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#9fb0ba", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9fb0ba", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={value => `$${Math.round(value / 1000)}k`} />
                    <Tooltip cursor={{ fill: "rgba(95,172,219,.05)" }} contentStyle={{ background: "#1f2933", border: "1px solid #34434f", borderRadius: 12 }} formatter={(value: number) => money.format(value)} />
                    <Bar dataKey="Revenue" fill="#5facdb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#ef6461" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="engine-card border-0">
              <CardHeader><CardTitle className="font-display text-xl uppercase">Profit and loss</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <StatementRow label="Revenue" value={overview.data.revenueCents} positive />
                <StatementRow label="Less expenses" value={-overview.data.expenseCents} />
                <div className="border-t border-border pt-4"><StatementRow label="Net profit / loss" value={overview.data.profitCents} positive={overview.data.profitCents >= 0} strong /></div>
                <p className="text-xs leading-5 text-muted-foreground">Period: {new Date(overview.data.start).toLocaleDateString("en-AU")} to {new Date(overview.data.end).toLocaleDateString("en-AU")}. This is an operating view, not tax advice.</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card className="engine-card border-0">
              <CardHeader><CardTitle className="font-display text-xl uppercase">Outstanding invoices</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {overview.data.outstanding.map(invoice => <TableRow key={invoice.id}><TableCell className="font-semibold text-white">{invoice.invoiceNumber}</TableCell><TableCell>{money.format(invoice.amountCents / 100)}</TableCell><TableCell>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString("en-AU") : "—"}</TableCell><TableCell><Badge variant="outline" className={invoice.status === "overdue" ? "border-rose-400/30 text-rose-400" : "border-amber-400/30 text-amber-400"}>{invoice.status}</Badge></TableCell></TableRow>)}
                      {overview.data.outstanding.length === 0 ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nothing outstanding.</TableCell></TableRow> : null}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="engine-card border-0">
              <CardHeader className="space-y-3">
                <div className="flex items-end justify-between gap-3"><div><CardTitle className="font-display text-xl uppercase">Expense register</CardTitle><p className="mt-1 text-xs text-muted-foreground">Filtered total: <span className="font-semibold text-rose-400">{money.format(filteredExpenseTotal / 100)}</span></p></div><Badge variant="outline">{filteredExpenses.length} matches</Badge></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select>
                  <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={expenseSearch} onChange={event => setExpenseSearch(event.target.value)} placeholder="Client, vendor or expense..." className="pl-9" /></div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-auto p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Expense</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredExpenses.map(expense => <TableRow key={expense.id}><TableCell>{new Date(expense.incurredAt).toLocaleDateString("en-AU")}</TableCell><TableCell><p className="font-semibold text-white">{expense.description}</p><p className="text-xs text-muted-foreground">{expense.vendor || expense.clientName || "General business"}</p></TableCell><TableCell><Badge variant="outline">{expense.category}</Badge></TableCell><TableCell className="text-right text-rose-400">{money.format(expense.amountCents / 100)}</TableCell></TableRow>)}
                    {filteredExpenses.length === 0 ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No expenses match the active period and filters.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}

      <ExpenseFormDialog open={expenseOpen} onOpenChange={setExpenseOpen} clients={clients.data ?? []} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof CircleDollarSign; tone: "blue" | "green" | "amber" | "red" }) {
  const colours = { blue: "text-primary bg-primary/10", green: "text-emerald-400 bg-emerald-400/10", amber: "text-amber-400 bg-amber-400/10", red: "text-rose-400 bg-rose-400/10" };
  return <div className="engine-card rounded-2xl p-4"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${colours[tone]}`}><Icon className="h-4.5 w-4.5" /></div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-extrabold text-white">{value}</p></div>;
}

function StatementRow({ label, value, positive = false, strong = false }: { label: string; value: number; positive?: boolean; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? "font-display text-xl font-bold uppercase" : "text-sm"}`}><span className="text-muted-foreground">{label}</span><span className={positive ? "text-emerald-400" : value < 0 ? "text-rose-400" : "text-white"}>{money.format(value / 100)}</span></div>;
}
