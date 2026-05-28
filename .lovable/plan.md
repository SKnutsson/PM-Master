## Mål

Adminanvändare ska kunna styra:
1. Vem som är **admin**
2. Vem som har tillgång till **CRM-modulen**
3. Vem som är **försäljningschef** (får se alla säljares hitrate + filtrera per säljare)
4. Vilken **säljare** en användare är kopplad till (för att kunna visa "egen data")

Övriga regler:
- Admin ser allt.
- Försäljningschef ser hitrate/statistik för alla säljare och kan filtrera.
- Vanlig CRM-användare ser bara sin egen hitrate/statistik (baserat på kopplad säljare).
- Användare utan CRM-tillgång ser inte CRM-läget alls i sidebar/mode-switcher.

---

## Databasändringar

**1. Utöka `app_role` enum:**
- Lägg till `sales_manager` (försäljningschef).
- Admin finns redan.

**2. Ny kolumn på `profiles`:**
- `can_access_crm boolean default false` – styr om CRM-läget syns.
- `linked_salesperson text` – namnet på säljaren i CRM (t.ex. "Mikael", "Martin", "Samuel"). Matchas mot `crm_quotes.salesperson`.

**3. RLS på `user_roles`:**
- Admin får full kontroll (finns redan).
- Lägg till säkerhetsdefinierad funktion `is_admin(uuid)` om den saknas (vi har `has_role` – återanvänd).

Inga grants behövs på befintliga tabeller (de finns redan).

---

## Frontend

**Ny hook `usePermissions()`** (`src/hooks/usePermissions.ts`):
Returnerar `{ isAdmin, isSalesManager, canAccessCrm, linkedSalesperson, canSeeAllSalespeople }`.
- `canSeeAllSalespeople = isAdmin || isSalesManager`

**`ModeSwitcher` / `Sidebar`:**
- Dölj CRM-tabben om `!canAccessCrm && !isAdmin`.
- Om användaren bara har CRM, dölj projektledningstabben (valfritt – kan diskuteras).

**`CrmStatsView`:**
- Lägg till säljarfilter (dropdown: Alla / Mikael / Martin / Samuel) – syns bara om `canSeeAllSalespeople`.
- Om inte → filtrera all data till `linkedSalesperson` och dölj "Win rate per säljare"-diagrammet (eller visa endast egen stapel).

**`CrmDashboard` / `SalesOverviewPanel`:**
- Samma filtreringslogik på offert- och orderdata.

**`ProfileView` – admin-sektion utökas:**
För varje användare visa toggles/inputs:
- Switch: **Admin**
- Switch: **Försäljningschef**
- Switch: **Tillgång till CRM**
- Dropdown: **Kopplad säljare** (Mikael / Martin / Samuel / Ingen)

Admin sparar via uppdatering av `profiles` + `user_roles` (insert/delete rader).

---

## Teknisk översikt

```text
profiles
  ├── can_access_crm  (bool)
  └── linked_salesperson (text)

user_roles  (en rad per roll per user)
  └── role: 'admin' | 'sales_manager' | 'user'

usePermissions()  →  styr UI + datafiltrering
```

Filtreringen sker **klient-sida** på redan hämtad CRM-data (RLS lämnas öppen för authenticated – samma som idag, för att inte bryta delade vyer). Om hård säkerhet på radnivå behövs senare kan vi lägga till det.

---

## Steg

1. Migration: utöka enum, lägg till kolumner på `profiles`.
2. Skapa `usePermissions` hook.
3. Uppdatera `ProfileView` admin-sektion med nya toggles + säljarkoppling.
4. Uppdatera `ModeSwitcher` / `Sidebar` att respektera `canAccessCrm`.
5. Filtrera `CrmStatsView`, `CrmDashboard`, `SalesOverviewPanel` efter `linkedSalesperson` när chef-rätt saknas; lägg till säljarfilter för chefer/admin.
