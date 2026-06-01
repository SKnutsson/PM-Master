import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, Pencil, Check, Users, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SALESPEOPLE } from '@/lib/crmConstants';
import { useProfiles, getInitials, getDisplayName, UserProfile } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';

const AVATAR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#e11d48', '#84cc16', '#0ea5e9', '#a855f7', '#64748b',
];

export function ProfileView() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState('');
  const [avatarColor, setAvatarColor] = useState('#3b82f6');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin section
  const { profiles, refetch: refetchProfiles } = useProfiles();
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editCanAccessCrm, setEditCanAccessCrm] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const email = user?.email ?? '';

  const initials = useMemo(() => {
    const f = firstName.trim().charAt(0).toUpperCase();
    const l = lastName.trim().charAt(0).toUpperCase();
    if (f && l) return `${f}${l}`;
    if (f) return f;
    if (email) return email.charAt(0).toUpperCase();
    return '?';
  }, [firstName, lastName, email]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, user_role, avatar_color')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setPhone(data.phone ?? '');
        setUserRole(data.user_role ?? '');
        setAvatarColor(data.avatar_color ?? '#3b82f6');
      }

      // Check admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!roleData);

      setIsLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || email;

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        user_role: userRole.trim() || null,
        avatar_color: avatarColor,
        display_name: displayName,
      })
      .eq('user_id', user.id);

    setIsSaving(false);
    if (error) {
      toast.error('Kunde inte spara profilen');
    } else {
      toast.success('Profilen har sparats');
      refetchProfiles();
    }
  };

  const openEditProfile = async (profile: UserProfile) => {
    setEditingProfile(profile);
    setEditFirst(profile.first_name ?? '');
    setEditLast(profile.last_name ?? '');
    setEditPhone(profile.phone ?? '');
    setEditRole(profile.user_role ?? '');
    setEditColor(profile.avatar_color ?? '#3b82f6');
    setEditCanAccessCrm(!!profile.can_access_crm);

    // Fetch roles for this user
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.user_id);
    const roleNames = (roles || []).map((r: any) => r.role);
    setEditIsAdmin(roleNames.includes('admin'));

    setEditDialogOpen(true);
  };

  const handleAdminSave = async () => {
    if (!editingProfile) return;
    const displayName = [editFirst.trim(), editLast.trim()].filter(Boolean).join(' ') || editingProfile.display_name || '';

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: editFirst.trim() || null,
        last_name: editLast.trim() || null,
        phone: editPhone.trim() || null,
        user_role: editRole.trim() || null,
        avatar_color: editColor,
        display_name: displayName,
        can_access_crm: editCanAccessCrm,
        linked_salesperson: editLinkedSalesperson === '__none__' ? null : editLinkedSalesperson,
      } as any)
      .eq('id', editingProfile.id);

    if (profileError) {
      toast.error('Kunde inte spara profilen');
      return;
    }

    // Sync roles
    const desired = new Set<string>(['user']);
    if (editIsAdmin) desired.add('admin');
    if (editIsSalesManager) desired.add('sales_manager');

    const { data: currentRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', editingProfile.user_id);
    const current = new Set((currentRoles || []).map((r: any) => r.role));

    const toAdd = [...desired].filter((r) => !current.has(r));
    const toRemove = [...current].filter((r) => !desired.has(r));

    for (const role of toAdd) {
      await supabase.from('user_roles').insert({ user_id: editingProfile.user_id, role: role as any });
    }
    for (const role of toRemove) {
      await supabase.from('user_roles').delete().eq('user_id', editingProfile.user_id).eq('role', role as any);
    }

    toast.success('Profilen har uppdaterats');
    setEditDialogOpen(false);
    refetchProfiles();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Laddar profil…</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Min profil</h1>

      {/* Avatar with edit button */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div
            className="flex items-center justify-center rounded-full text-white font-bold select-none"
            style={{ width: 96, height: 96, backgroundColor: avatarColor, fontSize: '2.5rem' }}
          >
            {initials}
          </div>
          <button
            onClick={() => setColorPickerOpen(true)}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Color picker dialog */}
      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Välj färg</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 justify-center py-4">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => { setAvatarColor(color); setColorPickerOpen(false); }}
                className="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                style={{
                  backgroundColor: color,
                  borderColor: avatarColor === color ? 'hsl(var(--foreground))' : 'transparent',
                }}
              >
                {avatarColor === color && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontaktuppgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Förnamn</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Förnamn" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Efternamn</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Efternamn" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Roll</Label>
            <Input id="role" value={userRole} onChange={(e) => setUserRole(e.target.value)} placeholder="T.ex. Projektledare, Montör" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefonnummer</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+46 70 123 45 67" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-postadress</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Sparar…' : 'Spara profil'}
        </Button>
      </div>

      {/* Admin section */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Administrera användare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserAvatar profile={p} size="md" />
                    <div>
                      <p className="text-sm font-medium">{getDisplayName(p) || p.display_name || '(Inget namn)'}</p>
                      <p className="text-xs text-muted-foreground">{p.user_role || 'Ingen roll'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEditProfile(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Redigera
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera användare</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <div
                className="flex items-center justify-center rounded-full text-white font-bold select-none"
                style={{ width: 64, height: 64, backgroundColor: editColor, fontSize: '1.5rem' }}
              >
                {(() => {
                  const f = editFirst.trim().charAt(0).toUpperCase();
                  const l = editLast.trim().charAt(0).toUpperCase();
                  return f && l ? `${f}${l}` : f || '?';
                })()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                  style={{
                    backgroundColor: color,
                    borderColor: editColor === color ? 'hsl(var(--foreground))' : 'transparent',
                  }}
                >
                  {editColor === color && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Förnamn</Label>
                <Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Efternamn</Label>
                <Input value={editLast} onChange={(e) => setEditLast(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Roll</Label>
              <Input value={editRole} onChange={(e) => setEditRole(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border">
            <p className="text-sm font-semibold">Behörigheter</p>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Administratör</Label>
                <p className="text-xs text-muted-foreground">Full åtkomst, hantera användare</p>
              </div>
              <Switch checked={editIsAdmin} onCheckedChange={setEditIsAdmin} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Försäljningschef</Label>
                <p className="text-xs text-muted-foreground">Ser alla säljares hitrate, kan filtrera</p>
              </div>
              <Switch checked={editIsSalesManager} onCheckedChange={setEditIsSalesManager} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Tillgång till CRM</Label>
                <p className="text-xs text-muted-foreground">Visar CRM-läget i menyn</p>
              </div>
              <Switch checked={editCanAccessCrm} onCheckedChange={setEditCanAccessCrm} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Kopplad säljare (för "egen data" i CRM)</Label>
              <Select value={editLinkedSalesperson} onValueChange={setEditLinkedSalesperson}>
                <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ingen</SelectItem>
                  {SALESPEOPLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleAdminSave}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
