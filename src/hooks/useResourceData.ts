import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Installer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
}

export interface ResourceEstimation {
  id: string;
  projectId: string;
  estimatedInstallHours: number;
  estimatedTravelHours: number;
}

export interface ProjectInstaller {
  id: string;
  projectId: string;
  installerId: string;
  installerName?: string;
  installerCompany?: string;
  isVacant: boolean;
  hotelStatus: 'bokat' | 'ej_bokat' | 'ej_relevant';
  hotelName: string | null;
  hotelNotering: string | null;
}

export interface DailyResourceEntry {
  id: string;
  projectId: string;
  installerId: string;
  projectInstallerId: string | null;
  installerName?: string;
  installerCompany?: string;
  date: string;
  plannedWorkHours: number;
  plannedTravelHours: number;
}

export function useResourceData() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [estimations, setEstimations] = useState<ResourceEstimation[]>([]);
  const [projectInstallers, setProjectInstallers] = useState<ProjectInstaller[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DailyResourceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInstallers = async () => {
    const { data } = await supabase.from('installers').select('*').order('name');
    if (data) {
      setInstallers(data.map(i => ({
        id: i.id, name: i.name, company: i.company,
        phone: i.phone || '', email: i.email || '',
      })));
    }
  };

  const loadEstimations = async () => {
    const { data } = await supabase.from('resource_estimations').select('*');
    if (data) {
      setEstimations(data.map(e => ({
        id: e.id, projectId: e.project_id,
        estimatedInstallHours: parseFloat(String(e.estimated_install_hours)),
        estimatedTravelHours: parseFloat(String(e.estimated_travel_hours)),
      })));
    }
  };

  const loadProjectInstallers = async () => {
    const { data } = await supabase.from('project_installers').select('*, installers(name, company)');
    if (data) {
      setProjectInstallers(data.map((pi: any) => ({
        id: pi.id, projectId: pi.project_id, installerId: pi.installer_id,
        installerName: pi.installers?.name, installerCompany: pi.installers?.company,
        isVacant: pi.is_vacant ?? false,
        hotelStatus: (pi.hotel_status as any) ?? 'ej_relevant',
        hotelName: pi.hotel_name ?? null,
        hotelNotering: pi.hotel_notering ?? null,
      })));
    }
  };

  const loadDailyEntries = async () => {
    const { data } = await supabase.from('daily_resource_entries').select('*, installers(name, company)');
    if (data) {
      setDailyEntries(data.map((d: any) => ({
        id: d.id, projectId: d.project_id, installerId: d.installer_id,
        projectInstallerId: d.project_installer_id || null,
        installerName: d.installers?.name, installerCompany: d.installers?.company,
        date: d.date, plannedWorkHours: parseFloat(String(d.planned_work_hours)),
        plannedTravelHours: parseFloat(String(d.planned_travel_hours)),
      })));
    }
  };

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadInstallers(), loadEstimations(), loadProjectInstallers(), loadDailyEntries()]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel('resource-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installers' }, () => loadInstallers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_estimations' }, () => loadEstimations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_installers' }, () => loadProjectInstallers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_resource_entries' }, () => loadDailyEntries())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Installer CRUD
  const addInstaller = useCallback(async (installer: Omit<Installer, 'id'>) => {
    const { data, error } = await supabase.from('installers')
      .insert({ name: installer.name, company: installer.company, phone: installer.phone, email: installer.email })
      .select().single();
    if (error) { console.error(error); return null; }
    const newInstaller = { ...installer, id: data.id } as Installer;
    setInstallers(prev => [...prev, newInstaller].sort((a, b) => a.name.localeCompare(b.name)));
    return newInstaller;
  }, []);

  const updateInstaller = useCallback(async (id: string, updates: Partial<Installer>) => {
    await supabase.from('installers').update(updates).eq('id', id);
    setInstallers(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const deleteInstaller = useCallback(async (id: string) => {
    await supabase.from('installers').delete().eq('id', id);
    setInstallers(prev => prev.filter(i => i.id !== id));
  }, []);

  // Estimation CRUD
  const upsertEstimation = useCallback(async (projectId: string, installHours: number, travelHours: number) => {
    const existing = estimations.find(e => e.projectId === projectId);
    if (existing) {
      const { error } = await supabase.from('resource_estimations').update({
        estimated_install_hours: installHours, estimated_travel_hours: travelHours,
      }).eq('id', existing.id);
      if (!error) {
        setEstimations(prev => prev.map(e => e.id === existing.id
          ? { ...e, estimatedInstallHours: installHours, estimatedTravelHours: travelHours } : e));
      }
    } else {
      const { data, error } = await supabase.from('resource_estimations').insert({
        project_id: projectId, estimated_install_hours: installHours, estimated_travel_hours: travelHours,
      }).select().single();
      if (!error && data) {
        setEstimations(prev => [...prev, {
          id: data.id, projectId, estimatedInstallHours: installHours, estimatedTravelHours: travelHours,
        }]);
      }
    }
  }, [estimations]);

  // Reassign installer on a project_installer row (keeps daily entries)
  const reassignInstaller = useCallback(async (projectInstallerId: string, newInstallerId: string | null, isVacant: boolean) => {
    const pi = projectInstallers.find(p => p.id === projectInstallerId);
    if (!pi) return;

    if (isVacant) {
      await supabase.from('project_installers').update({ is_vacant: true, installer_id: null } as any).eq('id', projectInstallerId);
      // Update daily entries to remove installer_id but keep project_installer_id
      await supabase.from('daily_resource_entries').update({ installer_id: null } as any)
        .eq('project_installer_id', projectInstallerId);
      setProjectInstallers(prev => prev.map(p => p.id === projectInstallerId ? { ...p, isVacant: true, installerId: null as any, installerName: undefined, installerCompany: undefined } : p));
      setDailyEntries(prev => prev.map(d => d.projectInstallerId === projectInstallerId ? { ...d, installerId: null as any } : d));
    } else if (newInstallerId) {
      const { data } = await supabase.from('project_installers')
        .update({ installer_id: newInstallerId, is_vacant: false })
        .eq('id', projectInstallerId)
        .select('*, installers(name, company)').single();
      if (data) {
        // Migrate daily entries to new installer
        await supabase.from('daily_resource_entries')
          .update({ installer_id: newInstallerId } as any)
          .eq('project_installer_id', projectInstallerId);
        setProjectInstallers(prev => prev.map(p => p.id === projectInstallerId ? {
          ...p, installerId: newInstallerId, isVacant: false,
          installerName: (data as any).installers?.name,
          installerCompany: (data as any).installers?.company,
        } : p));
        setDailyEntries(prev => prev.map(d => d.projectInstallerId === projectInstallerId
          ? { ...d, installerId: newInstallerId } : d));
      }
    }
  }, [projectInstallers]);

  // Project Installer CRUD
  const assignInstaller = useCallback(async (projectId: string, installerId: string) => {
    const { data, error } = await supabase.from('project_installers')
      .insert({ project_id: projectId, installer_id: installerId, is_vacant: false })
      .select('*, installers(name, company)').single();
    if (error) { console.error(error); return null; }
    const pi: ProjectInstaller = {
      id: data.id, projectId: data.project_id, installerId: data.installer_id,
      installerName: (data as any).installers?.name, installerCompany: (data as any).installers?.company,
      isVacant: false,
      hotelStatus: 'ej_relevant', hotelName: null, hotelNotering: null,
    };
    setProjectInstallers(prev => [...prev, pi]);
    return pi;
  }, []);

  // Assign a vacant slot
  const assignVacant = useCallback(async (projectId: string) => {
    const { data, error } = await supabase.from('project_installers')
      .insert({ project_id: projectId, installer_id: null, is_vacant: true } as any)
      .select('*, installers(name, company)').single();
    if (error) { console.error(error); return null; }
    const pi: ProjectInstaller = {
      id: data.id, projectId: data.project_id, installerId: data.installer_id,
      installerName: undefined, installerCompany: undefined, isVacant: true,
      hotelStatus: 'ej_relevant', hotelName: null, hotelNotering: null,
    };
    setProjectInstallers(prev => [...prev, pi]);
    return pi;
  }, []);

  const unassignInstaller = useCallback(async (projectInstallerId: string) => {
    // Delete all daily entries for this project_installer (handles both vacant and non-vacant via CASCADE + manual)
    await supabase.from('daily_resource_entries').delete()
      .eq('project_installer_id', projectInstallerId);
    // Also clean up by installer_id for older entries without project_installer_id
    const pi = projectInstallers.find(p => p.id === projectInstallerId);
    if (pi && pi.installerId) {
      await supabase.from('daily_resource_entries').delete()
        .eq('project_id', pi.projectId).eq('installer_id', pi.installerId)
        .is('project_installer_id', null);
    }
    await supabase.from('project_installers').delete().eq('id', projectInstallerId);
    setDailyEntries(prev => prev.filter(d => d.projectInstallerId !== projectInstallerId));
    setProjectInstallers(prev => prev.filter(p => p.id !== projectInstallerId));
  }, [projectInstallers]);

  // Daily Entry CRUD - now uses projectInstallerId as primary link
  const upsertDailyEntry = useCallback(async (projectId: string, projectInstallerId: string, installerId: string | null, date: string, workHours: number, travelHours: number) => {
    const existing = dailyEntries.find(d => d.projectInstallerId === projectInstallerId && d.date === date);
    if (existing) {
      if (workHours === 0 && travelHours === 0) {
        await supabase.from('daily_resource_entries').delete().eq('id', existing.id);
        setDailyEntries(prev => prev.filter(d => d.id !== existing.id));
      } else {
        await supabase.from('daily_resource_entries').update({
          planned_work_hours: workHours, planned_travel_hours: travelHours,
        }).eq('id', existing.id);
        setDailyEntries(prev => prev.map(d => d.id === existing.id ? { ...d, plannedWorkHours: workHours, plannedTravelHours: travelHours } : d));
      }
    } else if (workHours > 0 || travelHours > 0) {
      const { data, error } = await supabase.from('daily_resource_entries').insert({
        project_id: projectId,
        installer_id: installerId,
        project_installer_id: projectInstallerId,
        date,
        planned_work_hours: workHours,
        planned_travel_hours: travelHours,
      } as any).select('*, installers(name, company)').single();
      if (error) { console.error(error); return; }
      setDailyEntries(prev => [...prev, {
        id: data.id, projectId: data.project_id, installerId: data.installer_id,
        projectInstallerId: (data as any).project_installer_id || null,
        installerName: (data as any).installers?.name, installerCompany: (data as any).installers?.company,
        date: data.date, plannedWorkHours: parseFloat(String(data.planned_work_hours)),
        plannedTravelHours: parseFloat(String(data.planned_travel_hours)),
      }]);
    }
  }, [dailyEntries]);

  const deleteDailyEntry = useCallback(async (id: string) => {
    await supabase.from('daily_resource_entries').delete().eq('id', id);
    setDailyEntries(prev => prev.filter(d => d.id !== id));
  }, []);


    const payload: any = {};
    if (updates.hotelStatus !== undefined) payload.hotel_status = updates.hotelStatus;
    if (updates.hotelName !== undefined) payload.hotel_name = updates.hotelName;
    if (updates.hotelNotering !== undefined) payload.hotel_notering = updates.hotelNotering;
    await supabase.from('project_installers').update(payload).eq('id', projectInstallerId);
    setProjectInstallers(prev => prev.map(p => p.id === projectInstallerId ? { ...p, ...updates } as ProjectInstaller : p));
  }, []);

  return {
    installers, estimations, projectInstallers, dailyEntries, isLoading,
    addInstaller, updateInstaller, deleteInstaller,
    upsertEstimation,
    assignInstaller, assignVacant, unassignInstaller, reassignInstaller,
    upsertDailyEntry, deleteDailyEntry, updateHotel,
    refresh: loadAll,
  };
}
