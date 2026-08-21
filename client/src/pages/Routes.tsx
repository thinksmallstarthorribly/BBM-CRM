import { MapView } from "@/components/Map";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, CalendarDays, Check, MapPin, Route, Save, UsersRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Candidate = { key: string; leadId: number | null; clientId: number | null; label: string; address: string; kind: "lead" | "client" };

export default function Routes() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const leads = trpc.leads.list.useQuery(undefined);
  const clients = trpc.clients.list.useQuery();
  const savedRoutes = trpc.workspace.routes.useQuery();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<string[]>([]);
  const [routeName, setRouteName] = useState("Perth prospect run");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [metrics, setMetrics] = useState({ metres: 0, seconds: 0 });
  const [building, setBuilding] = useState(false);
  const candidates = useMemo<Candidate[]>(() => [
    ...(leads.data ?? []).filter(item => item.address).map(item => ({ key: `lead:${item.id}`, leadId: item.id, clientId: null, label: item.businessName, address: item.address!, kind: "lead" as const })),
    ...(clients.data ?? []).filter(item => item.address).map(item => ({ key: `client:${item.id}`, leadId: null, clientId: item.id, label: item.businessName, address: item.address!, kind: "client" as const })),
  ], [clients.data, leads.data]);
  const selectedStops = selected.map(key => candidates.find(item => item.key === key)).filter((item): item is Candidate => Boolean(item));
  const save = trpc.workspace.saveRoute.useMutation({ onSuccess: async () => { toast.success("Route saved"); await utils.workspace.routes.invalidate(); }, onError: error => toast.error(error.message) });

  const renderAddresses = (addresses: string[], onComplete?: (result: google.maps.DirectionsResult) => void) => {
    const map = mapRef.current;
    if (!map || addresses.length < 2) return toast.error("Select at least two stops with valid addresses");
    setBuilding(true);
    const renderer = rendererRef.current ?? new google.maps.DirectionsRenderer({ map, suppressMarkers: false });
    rendererRef.current = renderer;
    new google.maps.DirectionsService().route({ origin: addresses[0], destination: addresses[addresses.length - 1], waypoints: addresses.slice(1, -1).map(location => ({ location, stopover: true })), travelMode: google.maps.TravelMode.DRIVING, optimizeWaypoints: true }, (result, status) => {
      setBuilding(false);
      if (status !== google.maps.DirectionsStatus.OK || !result) return toast.error(`Google Directions could not build this route: ${status}`);
      renderer.setDirections(result);
      const legs = result.routes[0]?.legs ?? [];
      setMetrics({ metres: legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0), seconds: legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0) });
      onComplete?.(result);
    });
  };

  const saveCurrent = () => {
    if (selectedStops.length < 2) return toast.error("Select at least two stops");
    renderAddresses(selectedStops.map(item => item.address), result => {
      const legs = result.routes[0]?.legs ?? [];
      const metres = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
      const seconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);
      save.mutate({ name: routeName.trim() || "Perth route", routeDate: routeDate ? new Date(`${routeDate}T09:00:00`) : null, status: "planned", totalDistanceMetres: metres, totalDurationSeconds: seconds, stops: selectedStops.map((item, index) => ({ leadId: item.leadId, clientId: item.clientId, label: item.label, address: item.address, position: index })) });
    });
  };

  const toggle = (key: string) => setSelected(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  const distance = metrics.metres ? `${(metrics.metres / 1000).toFixed(1)} km` : "—";
  const duration = metrics.seconds ? `${Math.round(metrics.seconds / 60)} min` : "—";

  return <div className="space-y-5"><PageIntro eyebrow="Field planning" title="Route Planner" description="Build prospecting or client-service runs using live Google Directions, then save the stop order to the CRM." /><div className="grid gap-4 xl:grid-cols-[360px_1fr]"><aside className="space-y-4"><div className="engine-card rounded-2xl p-4"><div className="grid gap-3"><div className="space-y-2"><Label>Route name</Label><Input value={routeName} onChange={event => setRouteName(event.target.value)} /></div><div className="space-y-2"><Label>Date</Label><Input type="date" value={routeDate} onChange={event => setRouteDate(event.target.value)} /></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-black/15 p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Distance</p><p className="mt-1 font-display text-xl font-bold text-white">{distance}</p></div><div className="rounded-xl bg-black/15 p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Drive time</p><p className="mt-1 font-display text-xl font-bold text-white">{duration}</p></div></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => renderAddresses(selectedStops.map(item => item.address))} disabled={building || selectedStops.length < 2}><Route className="h-4 w-4" /> {building ? "Building..." : "Preview"}</Button><Button onClick={saveCurrent} disabled={save.isPending || building || selectedStops.length < 2}><Save className="h-4 w-4" /> Save</Button></div></div></div><div className="engine-card max-h-[480px] overflow-y-auto rounded-2xl p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="font-display text-lg font-bold uppercase">Available stops</h2><Badge variant="outline">{selected.length} selected</Badge></div><div className="space-y-2">{candidates.map(item => { const active = selected.includes(item.key); return <button key={item.key} onClick={() => toggle(item.key)} className={`w-full rounded-xl border p-3 text-left ${active ? "border-primary/50 bg-primary/[.07]" : "border-border/70 bg-black/10 hover:border-primary/30"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{active ? <Check className="h-4 w-4"/> : item.kind === "lead" ? <UsersRound className="h-4 w-4"/> : <Building2 className="h-4 w-4"/>}</div><div className="min-w-0"><p className="truncate font-semibold text-white">{item.label}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.address}</p></div></div></button>; })}{candidates.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Add street addresses to leads or clients to make them available as route stops.</p> : null}</div></div></aside><div className="engine-card overflow-hidden rounded-2xl"><MapView className="h-[760px]" initialCenter={{ lat: -31.9523, lng: 115.8613 }} initialZoom={11} onMapReady={map => { mapRef.current = map; }} /></div></div><section className="engine-card rounded-2xl p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold uppercase">Saved routes</h2><Badge variant="outline">{savedRoutes.data?.length ?? 0}</Badge></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{savedRoutes.data?.map(route => <article key={route.id} className="rounded-xl border border-border/70 bg-black/10 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-white">{route.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{route.routeDate ? new Date(route.routeDate).toLocaleDateString("en-AU") : "No date"}</p></div><Badge variant="outline">{route.status}</Badge></div><div className="mt-3 space-y-1">{route.stops.map(stop => <p key={stop.id} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary">{stop.position + 1}</span><span className="truncate">{stop.label}</span></p>)}</div><Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => renderAddresses(route.stops.map(stop => stop.address))}><MapPin className="h-3.5 w-3.5" /> Show route</Button></article>)}{savedRoutes.data?.length === 0 ? <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No routes saved yet.</p> : null}</div></section></div>;
}
