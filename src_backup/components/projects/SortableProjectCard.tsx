import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project } from '../../types';
import { ProjectCard } from './ProjectCard';

interface SortableProjectCardProps {
  key?: string | number;
  project: Project;
  onEdit: (project: Project) => void;
  onNotes: (project: Project) => void;
  onTasks: (project: Project) => void;
  onLinks: (project: Project) => void;
  onEmail: (project: Project) => void;
  onUpdate: (project: Project, updates: Partial<Project>) => void;
  onDelete: (project: Project) => void;
  onTouch: (project: Project) => void;
}

export function SortableProjectCard({ project, onEdit, onNotes, onTasks, onLinks, onEmail, onUpdate, onDelete, onTouch }: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <ProjectCard
        project={project}
        onEdit={() => onEdit(project)}
        onOpenNotes={() => onNotes(project)}
        onOpenTasks={() => onTasks(project)}
        onOpenLinks={() => onLinks(project)}
        onOpenEmail={() => onEmail(project)}
        onUpdate={(updates) => onUpdate(project, updates)}
        onDelete={() => onDelete(project)}
        onTouch={() => onTouch(project)}
        isKanban={true}
      />
    </div>
  );
}
