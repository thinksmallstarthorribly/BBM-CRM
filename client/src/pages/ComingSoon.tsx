import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench } from "lucide-react";
import { useLocation } from "wouter";

export default function ComingSoon({ title }: { title: string }) {
  const [, setLocation] = useLocation();
  return <div className="engine-card flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-8 text-center"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wrench className="h-7 w-7" /></div><p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-primary">Engine bay</p><h1 className="mt-2 text-4xl font-extrabold uppercase">{title}</h1><p className="mt-3 max-w-md text-muted-foreground">This operational engine is being connected to the persistent CRM backend.</p><Button onClick={() => setLocation("/")} variant="outline" className="mt-6"><ArrowLeft className="h-4 w-4" /> Command Centre</Button></div>;
}
