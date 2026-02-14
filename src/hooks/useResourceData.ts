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

export interface ResourceAllocation {
  id: string;
  projectId: string;
  installerId: string;
  installerName?: string;
  installerCompany?: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
}

export function useResourceData() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [estimations, setEstimations] = useState<ResourceEstimation[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadInstallers(), loadEstimations(), loadAllocations()]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel('resource-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installers' }, () => loadInstallers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_estimations' }, () => loadEstimations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_resource_allocations' }, () => loadAllocations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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

  const loadAllocations = async () => {
    const { data } = await supabase.from('project_resource_allocations').select('*, installers(name, company)');
    if (data) {
      setAllocations(data.map((a: any) => ({
        id: a.id, projectId: a.project_id, installerId: a.installer_id,
        installerName: a.installers?.name, installerCompany: a.installers?.company,
        startDate: a.start_date, endDate: a.end_date,
        plannedHours: parseFloat(String(a.planned_hours)),
      })));
    }
  };

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
      await supabase.from('resource_estimations').update({
        estimated_install_hours: installHours,
        estimated_travel_hours: travelHours,
      }).eq('id', existing.id);
    } else {
      await supabase.from('resource_estimations').insert({
        project_id: projectId,
        estimated_install_hours: installHours,
        estimated_travel_hours: travelHours,
      });
    }
  }, [estimations]);

  // Allocation CRUD
  const addAllocation = useCallback(async (alloc: Omit<ResourceAllocation, 'id' | 'installerName' | 'installerCompany'>) => {
    const { data, error } = await supabase.from('project_resource_allocations')
      .insert({
        project_id: alloc.projectId, installer_id: alloc.installerId,
        start_date: alloc.startDate, end_date: alloc.endDate,
        planned_hours: alloc.plannedHours,
      }).select().single();
    if (error) { console.error(error); return null; }
    return data;
  }, []);

  const updateAllocation = useCallback(async (id: string, updates: Partial<ResourceAllocation>) => {
    const updateData: Record<string, any> = {};
    if (updates.installerId !== undefined) updateData.installer_id = updates.installerId;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.plannedHours !== undefined) updateData.planned_hours = updates.plannedHours;
    await supabase.from('project_resource_allocations').update(updateData).eq('id', id);
  }, []);

  const deleteAllocation = useCallback(async (id: string) => {
    await supabase.from('project_resource_allocations').delete().eq('id', id);
  }, []);

  return {
    installers, estimations, allocations, isLoading,
    addInstaller, updateInstaller, deleteInstaller,
    upsertEstimation,
    addAllocation, updateAllocation, deleteAllocation,
    refresh: loadAll,
  };
}
