import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { BrainCircuit, Building2, CalendarDays, CircleDollarSign, ClipboardCheck, Columns3, Gauge, History, ListFilter, LogOut, Mail, Map, MapPinned, PanelLeft, ReceiptText, Route, Search, type LucideIcon } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type MenuItem = { icon: LucideIcon; label: string; path: string };
type MenuGroup = { label: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  { label: "Command", items: [
    { icon: Gauge, label: "Home", path: "/" },
    { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  ]},
  { label: "Pipeline", items: [
    { icon: Columns3, label: "Lead Lifecycle", path: "/lead-lifecycle" },
    { icon: ListFilter, label: "All Leads", path: "/all-leads" },
    { icon: History, label: "Lead Timeline", path: "/lead-timeline" },
    { icon: Search, label: "Lead Finder", path: "/lead-finder" },
  ]},
  { label: "Operations", items: [
    { icon: Building2, label: "Clients", path: "/clients" },
    { icon: ReceiptText, label: "Invoicing", path: "/invoicing" },
    { icon: CircleDollarSign, label: "Financials", path: "/financials" },
    { icon: Mail, label: "Templates", path: "/templates" },
  ]},
  { label: "Intelligence", items: [
    { icon: BrainCircuit, label: "Intel", path: "/intel" },
    { icon: MapPinned, label: "Local", path: "/local" },
    { icon: Route, label: "Routes", path: "/routes" },
  ]},
  { label: "Website", items: [
    { icon: ClipboardCheck, label: "Checklist Responses", path: "/checklist-responses" },
  ]},
];

const menuItems = menuGroups.flatMap(group => group.items);
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 248;
const MIN_WIDTH = 220;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();

  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()), [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return <LoginScreen />;
  }

  if (user.role !== "admin") {
    return <div className="engine-grid flex min-h-screen items-center justify-center p-6"><div className="engine-card max-w-lg rounded-3xl p-10 text-center"><h1 className="text-3xl font-extrabold uppercase">Access denied</h1><p className="mt-3 text-muted-foreground">This system is restricted to Alex Cooper&apos;s authorised owner account.</p><Button onClick={logout} variant="outline" className="mt-6">Sign out</Button></div></div>;
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent sidebarWidth={sidebarWidth} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function LoginScreen() {
  const { login, loginError, loginPending } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(email, password);
  }
  return (
    <div className="engine-grid flex min-h-screen items-center justify-center p-5">
      <div className="engine-card flex w-full max-w-md flex-col items-center gap-8 rounded-3xl p-8 sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-extrabold tracking-tight text-primary-foreground shadow-[0_12px_40px_rgba(95,172,219,.25)]">BBM</div>
        <div className="space-y-3 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.28em] text-primary">Home of Engines</p>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Command centre locked</h1>
          <p className="text-sm leading-6 text-muted-foreground">Secure single-owner access for Big Blue Mop. Sign in with your owner account.</p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
          <input type="email" autoComplete="username" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
          <input type="password" autoComplete="current-password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
          {loginError ? <p className="text-center text-sm text-destructive">{loginError}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={loginPending}>{loginPending ? "Signing in…" : "Unlock Home of Engines"}</Button>
        </form>
      </div>
    </div>
  );
}

function DashboardLayoutContent({ children, sidebarWidth, setSidebarWidth }: { children: React.ReactNode; sidebarWidth: number; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => location === item.path || (item.path !== "/" && location.startsWith(`${item.path}/`)));

  useEffect(() => { if (isCollapsed) setIsResizing(false); }, [isCollapsed]);
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const nextWidth = event.clientX - left;
      if (nextWidth >= MIN_WIDTH && nextWidth <= MAX_WIDTH) setSidebarWidth(nextWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return <>
    <div className="relative" ref={sidebarRef}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" disableTransition={isResizing}>
        <SidebarHeader className="h-[76px] justify-center border-b border-sidebar-border px-3">
          <div className="flex w-full items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-extrabold text-primary-foreground shadow-[0_8px_28px_rgba(95,172,219,.2)]">BBM</div>{!isCollapsed ? <div className="min-w-0 flex-1"><span className="block truncate font-display text-base font-extrabold uppercase tracking-tight text-white">Big Blue Mop</span><span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">Home of Engines</span></div> : null}<button onClick={toggleSidebar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4 text-muted-foreground" /></button></div>
        </SidebarHeader>
        <SidebarContent className="gap-0 px-2 py-3">
          {menuGroups.map(group => <div key={group.label} className="mb-3 last:mb-0">{!isCollapsed ? <div className="px-3 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70">{group.label}</div> : null}<SidebarMenu>{group.items.map(item => { const active = location === item.path || (item.path !== "/" && location.startsWith(`${item.path}/`)); return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={active} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-9 rounded-lg border-l-2 border-transparent font-medium transition-all data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-white"><item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></div>)}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3"><DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Open owner account menu" className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 shrink-0 border"><AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{user?.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold leading-none">{user?.name || "Alex Cooper"}</p><p className="mt-1.5 truncate text-xs text-muted-foreground">Owner</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter>
      </Sidebar>
      <div role="separator" aria-label="Resize navigation sidebar" aria-orientation="vertical" aria-valuemin={MIN_WIDTH} aria-valuemax={MAX_WIDTH} aria-valuenow={sidebarWidth} tabIndex={isCollapsed ? -1 : 0} className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 focus:bg-primary/30 focus:outline-none ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} onKeyDown={event => { if (event.key === "ArrowLeft") { event.preventDefault(); setSidebarWidth(Math.max(MIN_WIDTH, sidebarWidth - 8)); } if (event.key === "ArrowRight") { event.preventDefault(); setSidebarWidth(Math.min(MAX_WIDTH, sidebarWidth + 8)); } }} style={{ zIndex: 50 }} />
    </div>
    <SidebarInset>
      {isMobile ? <div className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/95 px-2 backdrop-blur"><SidebarTrigger className="h-9 w-9 rounded-lg" /><span className="ml-2 font-display font-bold uppercase">{activeMenuItem?.label ?? "Menu"}</span></div> : <div className="sticky top-0 z-30 flex h-[58px] items-center border-b border-border bg-background/90 px-6 backdrop-blur-xl"><p className="flex-1 font-display text-lg font-bold uppercase tracking-tight text-white">{activeMenuItem?.label ?? "Home of Engines"}</p><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><Map className="h-3.5 w-3.5 text-primary" /> Perth, WA</div></div>}
      <main className="flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
    </SidebarInset>
  </>;
}
