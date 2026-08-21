# BBM_v14 Interface Reference

The source of truth is `https://github.com/thinksmallstarthorribly/BBM-CRM/blob/main/BBM_v14.html`. The existing application is a single 2,724-line HTML file with a fixed-height desktop CRM shell, a 218-pixel sidebar, a compact 54-pixel top bar, pill-shaped controls, KPI cards, scrollable views, panel-based data layouts, and short transition timing.

## Visual patterns to preserve

The existing interface uses a dense but friendly operational-dashboard layout. Navigation is persistent in a left sidebar, the active navigation item has an accent strip and tinted background, and dashboard content is organised into KPI cards followed by multi-column operational panels. Cards use rounded corners, restrained shadows, compact uppercase micro-labels, and strong numeric hierarchy. Interactions use quick hover states and small motion rather than large decorative animation.

The new application will preserve that information hierarchy and interaction density while replacing the light cyan palette with the confirmed dark charcoal `#1F2933` foundation and Big Blue Mop blue `#5FACDB` accent. Barlow and Barlow Condensed will replace the older Nunito and DM Mono pairing to match the current brand system.

## Required navigation mapping

| Existing/confirmed view | New route responsibility |
|---|---|
| Home | KPIs, briefing, pipeline summary, financial summary, upcoming work |
| Lead Lifecycle | Exact six-stage Kanban pipeline |
| All Leads | Searchable and filterable lead table |
| Lead Timeline | Chronological interaction feed across all leads |
| Templates | Reusable email and follow-up templates |
| Invoicing | Invoice register, outstanding status, and job billing |
| Intel | Review intelligence and lead opportunity scoring |
| Local | Google Places prospect discovery |
| Routes | Map-based prospect and client route planning |
| Checklist Responses | Psychic Cleaner Checklist submissions and pipeline conversion |
| Calendar | Scheduled and completed client jobs |

## Implementation decisions

The new application will use the scaffold's authenticated dashboard layout rather than re-creating the shell from scratch. All business procedures will use owner-only backend guards. The prebuilt map component will power Places search and routes. Database-backed records will replace all browser-local state.

## Verified live-render details

The rendered command centre uses six KPI cards across the first row, followed by three operational columns: a tall **Needs Action** feed, a **Top Uncontacted** opportunity feed, and a narrow **Pipeline** summary. The sidebar groups links under **Workspace**, **Intelligence**, and **Website**, includes an alert badge on the command centre, and ends with a compact live-snapshot summary. The layout is deliberately information-dense, with short card heights, small metadata, narrow gaps, and persistent access to `Import JSON` and `Add Lead` actions.

The exact legacy labels are **Command Centre**, **Calendar**, **Lead Lifecycle**, **All Leads**, **Lead Timeline**, **Lead Finder**, **Email Templates**, **Invoicing**, **Perth Metro**, **Local Hitlist**, **Route Planner**, and **Checklist Responses**. The new sidebar will retain these labels as the primary visible names while using descriptive route paths internally.

The source pipeline used `To Contact` and `Won`; the confirmed product requirement overrides that data model with the exact ordered stages **New**, **Contacted**, **Quote Sent**, **Won**, **Active Client**, and **Lost**. Existing useful patterns such as stage counts, priority badges, urgent-date flags, score chips, review-star metadata, quick-add actions, and chronological activity logging will be preserved in the redesigned workflows.
