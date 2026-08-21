import { PageIntro } from "@/components/crm/PageIntro";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function CalendarView() {
  const [month, setMonth] = useState(() => new Date());
  const [, setLocation] = useLocation();
  const jobs = trpc.clients.calendar.useQuery();
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  if (jobs.isLoading) return <Skeleton className="h-[760px] rounded-2xl" />;
  return <div className="space-y-5"><PageIntro eyebrow="Job operations" title="Calendar" description="Scheduled and completed work across every Big Blue Mop client." actions={<div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => setMonth(current => subMonths(current, 1))}><ChevronLeft className="h-4 w-4" /></Button><div className="min-w-36 text-center font-display text-xl font-bold uppercase">{format(month, "MMMM yyyy")}</div><Button size="icon" variant="outline" onClick={() => setMonth(current => addMonths(current, 1))}><ChevronRight className="h-4 w-4" /></Button></div>} /><div className="engine-card overflow-x-auto rounded-2xl p-3"><div className="min-w-[880px]"><div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div key={day} className="p-2">{day}</div>)}</div><div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border/70">{days.map(day => { const dayJobs = jobs.data?.filter(job => isSameDay(new Date(job.scheduledStart), day)) ?? []; return <div key={day.toISOString()} className={`min-h-32 border-b border-r border-border/60 p-2 ${isSameMonth(day, month) ? "bg-black/10" : "bg-black/25 text-muted-foreground/50"}`}><div className="mb-2 text-xs font-semibold">{format(day, "d")}</div><div className="space-y-1.5">{dayJobs.map(job => <button key={job.id} onClick={() => setLocation(`/clients/${job.clientId}`)} className={`w-full rounded-md border-l-2 p-2 text-left text-[10px] ${job.status === "completed" ? "border-emerald-400 bg-emerald-400/[.07]" : job.status === "cancelled" ? "border-rose-400 bg-rose-400/[.07]" : "border-primary bg-primary/[.07]"}`}><p className="truncate font-bold text-white">{job.clientName}</p><p className="mt-0.5 truncate text-muted-foreground">{format(new Date(job.scheduledStart), "h:mm a")} · {job.title}</p></button>)}</div></div>; })}</div></div></div></div>;
}
