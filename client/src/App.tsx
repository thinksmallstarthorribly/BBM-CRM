import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const AllLeads = lazy(() => import("./pages/AllLeads"));
const ChecklistResponses = lazy(() => import("./pages/ChecklistResponses"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Clients = lazy(() => import("./pages/Clients"));
const LeadPipeline = lazy(() => import("./pages/LeadPipeline"));
const LeadTimeline = lazy(() => import("./pages/LeadTimeline"));
const Templates = lazy(() => import("./pages/Templates"));
const Invoicing = lazy(() => import("./pages/Invoicing"));
const Financials = lazy(() => import("./pages/Financials"));
const LocalView = lazy(() => import("./pages/LocalView"));
const Intel = lazy(() => import("./pages/Intel"));
const Routes = lazy(() => import("./pages/Routes"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout><Suspense fallback={<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading view">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-card" />)}</div>}><Switch>
      <Route path="/" component={Home} />
      <Route path="/calendar" component={CalendarView} />
      <Route path="/lead-lifecycle" component={LeadPipeline} />
      <Route path="/all-leads" component={AllLeads} />
      <Route path="/lead-timeline" component={LeadTimeline} />
      <Route path="/lead-finder">{() => <LocalView mode="finder" />}</Route>
      <Route path="/clients/:id">{params => <ClientDetail id={Number(params.id)} />}</Route>
      <Route path="/clients" component={Clients} />
      <Route path="/invoicing" component={Invoicing} />
      <Route path="/financials" component={Financials} />
      <Route path="/templates" component={Templates} />
      <Route path="/intel" component={Intel} />
      <Route path="/local">{() => <LocalView />}</Route>
      <Route path="/routes" component={Routes} />
      <Route path="/checklist-responses" component={ChecklistResponses} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch></Suspense></DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
