import { MapView } from "@/components/Map";
import { PageIntro } from "@/components/crm/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, Building2, MapPin, Plus, Search, Star } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type LocalResult = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  location: google.maps.LatLngLiteral | null;
  cleaningMentionCount: number;
  excerpt: string | null;
  keyIssues: string | null;
};

const cleaningTerms = ["clean", "dirty", "dust", "toilet", "bathroom", "rubbish", "smell", "floor", "bin", "hygiene"];
const scoreResult = (rating: number | null, reviews: number, mentions = 0) => Math.max(0, Math.min(100, Math.round((5 - (rating ?? 5)) * 22 + Math.min(reviews, 150) / 6 + mentions * 8)));

export default function LocalView({ mode = "local" }: { mode?: "finder" | "local" }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [query, setQuery] = useState("offices Perth WA");
  const [results, setResults] = useState<LocalResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [analysingId, setAnalysingId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const saveSignal = trpc.workspace.saveReviewSignal.useMutation({ onSuccess: async () => { toast.success("Review signal saved to Intel"); await utils.workspace.reviewSignals.invalidate(); }, onError: error => toast.error(error.message) });
  const addLead = trpc.leads.create.useMutation({ onSuccess: async () => { toast.success("Business added to the lead pipeline"); await Promise.all([utils.leads.list.invalidate(), utils.dashboard.summary.invalidate()]); }, onError: error => toast.error(error.message) });

  const runSearch = () => {
    const map = mapRef.current;
    if (!map || !query.trim()) return;
    setSearching(true);
    markers.current.forEach(marker => { marker.map = null; });
    markers.current = [];
    const service = new google.maps.places.PlacesService(map);
    service.textSearch({ query: query.trim(), location: { lat: -31.9523, lng: 115.8613 }, radius: 50000 }, (places, status) => {
      setSearching(false);
      if (status !== google.maps.places.PlacesServiceStatus.OK || !places?.length) return toast.error("No Google Places results found");
      const next = places.slice(0, 20).filter(place => place.place_id && place.name).map(place => ({ placeId: place.place_id!, name: place.name!, address: place.formatted_address || place.vicinity || "Address unavailable", rating: place.rating ?? null, reviewCount: place.user_ratings_total ?? 0, location: place.geometry?.location?.toJSON() ?? null, cleaningMentionCount: 0, excerpt: null, keyIssues: null }));
      setResults(next);
      next.forEach(item => { if (item.location) markers.current.push(new google.maps.marker.AdvancedMarkerElement({ map, position: item.location, title: item.name })); });
      if (next[0]?.location) map.setCenter(next[0].location);
    });
  };

  const analyseReviews = (item: LocalResult) => {
    const map = mapRef.current;
    if (!map) return;
    setAnalysingId(item.placeId);
    new google.maps.places.PlacesService(map).getDetails({ placeId: item.placeId, fields: ["name", "formatted_address", "rating", "user_ratings_total", "reviews"] }, (place, status) => {
      setAnalysingId(null);
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return toast.error("Review details could not be loaded");
      const reviews = place.reviews ?? [];
      const issueReviews = reviews.filter(review => cleaningTerms.some(term => review.text?.toLowerCase().includes(term)));
      const excerpt = issueReviews[0]?.text ?? null;
      const keyIssues = cleaningTerms.filter(term => issueReviews.some(review => review.text?.toLowerCase().includes(term))).join(", ") || null;
      const updated = { ...item, address: place.formatted_address || item.address, rating: place.rating ?? item.rating, reviewCount: place.user_ratings_total ?? item.reviewCount, cleaningMentionCount: issueReviews.length, excerpt, keyIssues };
      setResults(current => current.map(result => result.placeId === item.placeId ? updated : result));
      saveSignal.mutate({ googlePlaceId: updated.placeId, businessName: updated.name, address: updated.address, rating: updated.rating, reviewCount: updated.reviewCount, cleaningMentionCount: updated.cleaningMentionCount, signalScore: scoreResult(updated.rating, updated.reviewCount, updated.cleaningMentionCount), keyIssues: updated.keyIssues, rawExcerpt: updated.excerpt });
    });
  };

  return <div className="space-y-5"><PageIntro eyebrow="Google Places intelligence" title={mode === "finder" ? "Lead Finder" : "Local Hitlist"} description={mode === "finder" ? "Search Perth commercial prospects directly through Google Places and add selected businesses to the pipeline." : "Surface local opportunities with weak review signals, then save them into the Intel engine."} /><div className="engine-card flex flex-col gap-2 rounded-2xl p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && runSearch()} className="pl-9" placeholder="Try: medical centres Osborne Park" /></div><Button onClick={runSearch} disabled={searching}>{searching ? "Searching..." : "Search Google Places"}</Button></div><div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><div className="engine-card overflow-hidden rounded-2xl"><MapView className="h-[650px]" initialCenter={{ lat: -31.9523, lng: 115.8613 }} initialZoom={11} onMapReady={map => { mapRef.current = map; }} /></div><div className="engine-card max-h-[650px] overflow-y-auto rounded-2xl p-3">{results.length ? <div className="space-y-2">{results.map(item => { const score = scoreResult(item.rating, item.reviewCount, item.cleaningMentionCount); return <article key={item.placeId} className="rounded-xl border border-border/70 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-white">{item.name}</h2><p className="mt-1 flex items-start gap-1 text-xs leading-5 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item.address}</p></div><div className={`flex h-10 min-w-10 items-center justify-center rounded-xl font-display text-lg font-bold ${score >= 55 ? "bg-rose-400/10 text-rose-400" : score >= 30 ? "bg-amber-400/10 text-amber-400" : "bg-primary/10 text-primary"}`}>{score}</div></div><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline"><Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" /> {item.rating ?? "—"} · {item.reviewCount} reviews</Badge>{item.cleaningMentionCount > 0 ? <Badge className="bg-rose-400/10 text-rose-400">{item.cleaningMentionCount} cleaning signals</Badge> : null}</div>{item.excerpt ? <blockquote className="mt-3 border-l-2 border-rose-400/50 pl-3 text-xs italic leading-5 text-muted-foreground">“{item.excerpt.slice(0, 220)}{item.excerpt.length > 220 ? "…" : ""}”</blockquote> : null}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => analyseReviews(item)} disabled={analysingId === item.placeId}><BrainCircuit className="h-3.5 w-3.5" /> {analysingId === item.placeId ? "Analysing..." : "Analyse reviews"}</Button><Button size="sm" onClick={() => addLead.mutate({ businessName: item.name, address: item.address, stage: "New", source: "Google Places · Local Hitlist", googlePlaceId: item.placeId, googleRating: item.rating, googleReviewCount: item.reviewCount, checklistScore: null, tier: score >= 55 ? "Hot" : score >= 30 ? "Warm" : "Watch", notes: item.excerpt ? `Review signal: ${item.excerpt}` : "Prospect discovered through Google Places." })} disabled={addLead.isPending}><Plus className="h-3.5 w-3.5" /> Add lead</Button></div></article>; })}</div> : <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center"><Building2 className="h-9 w-9 text-primary"/><h2 className="mt-4 font-display text-2xl font-bold uppercase">Search Perth</h2><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Use a business category and suburb. Results, ratings and review intelligence will appear here.</p></div>}</div></div></div>;
}
