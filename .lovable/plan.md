

## Vakant-platser direkt i resursplaneringen

### Problem
Just nu kraver funktionen `assignVacant` att det redan finns minst en montör i systemet, eftersom kolumnen `installer_id` i `project_installers` inte tillåter null-värden. En "placeholder"-montör används som workaround, vilket är opålitligt och förhindrar att man lägger till vakant direkt.

### Lösning

#### 1. Databasändring
Gör kolumnen `installer_id` i `project_installers` nullable så att vakanta platser kan skapas utan att behöva en riktig montör som placeholder.

```sql
ALTER TABLE public.project_installers 
  ALTER COLUMN installer_id DROP NOT NULL;
```

#### 2. Uppdatera `useResourceData.ts` - `assignVacant`
Förenkla funktionen att sätta `installer_id` till `null` istället för att söka upp en placeholder-montör. Tar bort kravet på att montörer måste finnas.

#### 3. Inga begränsningar på antal vakanta
Koden har redan ingen begränsning -- dropdown visar alltid "Vakant" som alternativ och det finns ingen unik constraint. Inga extra ändringar behövs här.

---

### Teknisk sammanfattning

| Fil | Ändring |
|-----|---------|
| `supabase/migrations/` (ny) | `ALTER COLUMN installer_id DROP NOT NULL` |
| `src/hooks/useResourceData.ts` | Förenkla `assignVacant` -- sätt `installer_id: null` direkt |

Inga UI-ändringar behövs -- `AssignInstallerDialog` visar redan "Vakant" i listan och det finns ingen spärr mot flera vakanta poster.

