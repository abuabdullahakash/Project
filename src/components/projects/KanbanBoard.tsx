import React, { useState, useMemo } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { Project, Stage } from '../../types';
import { calculateRemainingDays } from '../../utils/dateUtils';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';
import { NotesDrawer } from './NotesDrawer';
import { TasksDrawer } from './TasksDrawer';
import { ProjectLinksModal } from './ProjectLinksModal';
import { EmailModal } from './EmailModal';
import { ProjectMediaModal } from './ProjectMediaModal';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  projects: Project[];
  activeTab: 'running' | 'delivered' | 'revision' | 'all';
  filterStage: string;
  filterPriority: string;
  sortBy: string;
  onlyOverdue: boolean;
  selectedMonth: string;
  selectedYear: string;
  defaultTeamId?: string;
}

const STAGES: Stage[] = ['First Stage', 'Middle Stage', 'Final Stage', 'Delivered'];

export function KanbanBoard({ projects, activeTab, filterStage, filterPriority, sortBy, onlyOverdue, selectedMonth, selectedYear, defaultTeamId }: KanbanBoardProps) {
  const { updateProject, deleteProject, touchProject } = useProjects();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [notesProject, setNotesProject] = useState<Project | null>(null);
  const [tasksProject, setTasksProject] = useState<Project | null>(null);
  const [linksProject, setLinksProject] = useState<Project | null>(null);
  const [emailProject, setEmailProject] = useState<Project | null>(null);
  const [mediaProject, setMediaProject] = useState<Project | null>(null);

  // Filter projects based on the current dashboard filters
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (activeTab === 'running') {
        if (p.status !== 'Active' && p.status !== 'Revision') return false;
      } else if (activeTab === 'delivered') {
        if (p.status !== 'Delivered') return false;
        
        const monthMatch = selectedMonth === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getMonth() === parseInt(selectedMonth));
        const yearMatch = selectedYear === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getFullYear() === parseInt(selectedYear));
        
        if (!monthMatch || !yearMatch) {
          return false;
        }
      } else if (activeTab === 'revision') {
        if (p.status !== 'Revision') return false;
      }

      if (activeTab === 'delivered') {
        if (filterStage !== 'All' && filterStage !== 'Delivered') return false;
      } else {
        if (filterStage !== 'All' && p.stage !== filterStage && activeTab !== 'all') return false;
      }
      
      if (filterPriority !== 'All' && p.priority !== filterPriority && activeTab !== 'all') return false;
      if (onlyOverdue && activeTab !== 'delivered' && activeTab !== 'all') {
        if (calculateRemainingDays(p.endDate) >= 0) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'Nearest Deadline') {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
      if (sortBy === 'Highest Priority') {
        const priorityWeight = { High: 3, Medium: 2, Low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortBy === 'Recently Updated') {
        return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
      }
      return 0;
    });
  }, [projects, activeTab, filterStage, filterPriority, sortBy, onlyOverdue, selectedMonth, selectedYear]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Logic for moving items between columns is handled in DragEnd for simplicity,
    // but we could do optimistic updates here if needed.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeProject = filteredProjects.find(p => p.id === activeId);
    if (!activeProject) return;

    // Check if dropped over a column or another item
    const isOverColumn = STAGES.includes(overId as Stage);
    
    let newStage: Stage = activeProject.stage;

    if (isOverColumn) {
      newStage = overId as Stage;
    } else {
      const overProject = filteredProjects.find(p => p.id === overId);
      if (overProject) {
        newStage = overProject.stage;
      }
    }

    if (activeProject.stage !== newStage) {
      // If moving to Delivered, we should also update the status to Delivered
      const updates: Partial<Project> = { stage: newStage };
      if (newStage === 'Delivered' && activeProject.status !== 'Delivered') {
        updates.status = 'Delivered';
      } else if (newStage !== 'Delivered' && activeProject.status === 'Delivered') {
        updates.status = 'Active'; // Revert to Active if moved out of Delivered
      }
      
      updateProject(activeId, updates);
    }
  };

  const activeProject = useMemo(
    () => filteredProjects.find(p => p.id === activeId),
    [activeId, filteredProjects]
  );

  return (
    <div className="flex h-full gap-6 overflow-x-auto pb-8 snap-x">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {STAGES.map(stage => {
          const stageProjects = filteredProjects.filter(p => p.stage === stage);
          return (
            <KanbanColumn 
              key={stage} 
              stage={stage} 
              projects={stageProjects} 
              onEdit={setEditingProject}
              onNotes={setNotesProject}
              onTasks={setTasksProject}
              onLinks={setLinksProject}
              onEmail={setEmailProject}
              onMedia={setMediaProject}
              onUpdate={(project, updates) => updateProject(project.id, updates)}
              onDelete={(project) => deleteProject(project.id)}
              onTouch={(project) => touchProject(project.id)}
            />
          );
        })}
        
        <DragOverlay>
          {activeProject ? (
            <div className="opacity-80 rotate-2 scale-105 cursor-grabbing">
              <ProjectCard
                project={activeProject}
                onEdit={() => {}}
                onOpenNotes={() => {}}
                onOpenTasks={() => {}}
                onOpenLinks={() => {}}
                onOpenEmail={() => {}}
                onOpenMedia={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
                onTouch={() => {}}
                isKanban={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingProject && (
        <ProjectFormModal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          initialData={editingProject}
          defaultTeamId={defaultTeamId}
          onSubmit={(updates) => {
            updateProject(editingProject.id, updates);
            setEditingProject(null);
          }}
        />
      )}

      {notesProject && (
        <NotesDrawer
          isOpen={true}
          onClose={() => setNotesProject(null)}
          project={notesProject}
          onUpdateProject={updateProject}
        />
      )}

      {tasksProject && (
        <TasksDrawer
          isOpen={true}
          onClose={() => setTasksProject(null)}
          project={tasksProject}
          onUpdateProject={(id, updates) => {
            updateProject(id, updates);
            setTasksProject(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}

      {linksProject && (
        <ProjectLinksModal
          isOpen={true}
          onClose={() => setLinksProject(null)}
          project={linksProject}
          onUpdateProject={updateProject}
        />
      )}

      <EmailModal
        project={emailProject}
        isOpen={!!emailProject}
        onClose={() => setEmailProject(null)}
      />

      {mediaProject && (
        <ProjectMediaModal
          project={mediaProject}
          onClose={() => setMediaProject(null)}
          onUpdate={(updates) => {
            updateProject(mediaProject.id, updates);
            setMediaProject(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}
    </div>
  );
}
