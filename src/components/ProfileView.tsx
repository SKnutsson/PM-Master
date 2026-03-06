import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Check } from 'lucide-react';

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
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Laddar profil…</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Min profil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex items-center justify-center rounded-full text-white font-bold text-3xl select-none"
          style={{ width: 96, height: 96, backgroundColor: avatarColor }}
        >
          {initials}
        </div>

        {/* Color picker */}
        <div className="flex flex-wrap gap-2 justify-center">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setAvatarColor(color)}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
              style={{
                backgroundColor: color,
                borderColor: avatarColor === color ? 'hsl(var(--foreground))' : 'transparent',
              }}
            >
              {avatarColor === color && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

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
    </div>
  );
}
