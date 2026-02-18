import { useEffect, useState } from 'react';
import { Plus, Clock, Play, Square, GripVertical, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import type { Task, Project, TaskStatus, TaskPriority, TimeEntry } from '../types';
import PageHeader from '../components/shared/PageHeader';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useAuthStore } from '../store/auth';

type ViewMode = 'list' | 'board';

const statusColumns: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const statusLabels: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

const statusColors: Record<TaskStatus, string> = {
  BACKLOG: 'bg-gray-100 text-gray-700',
  TODO: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);

  // Task form
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', status: 'TODO' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority, projectId: '',
    dueDate: '', estimatedHours: '',
  });

  // Project form
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: '#3b82f6' });

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  async function loadData() {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, timerRes] = await Promise.all([
        api.get('/tasks', { params: selectedProject ? { projectId: selectedProject, parentId: 'null' } : { parentId: 'null' } }),
        api.get('/tasks/projects'),
        api.get('/tasks/time-entries/active'),
      ]);
      setTasks(tasksRes.data.tasks);
      setProjects(projectsRes.data.projects);
      setActiveTimer(timerRes.data.entry);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  function openNewTask(status?: TaskStatus) {
    setTaskForm({
      title: '', description: '',
      status: status || 'TODO',
      priority: 'MEDIUM',
      projectId: selectedProject,
      dueDate: '', estimatedHours: '',
    });
    setEditingTask(null);
    setShowForm(true);
  }

  function openEditTask(task: Task) {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      projectId: task.projectId || '',
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
    });
    setEditingTask(task);
    setShowForm(true);
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description || undefined,
        status: taskForm.status,
        priority: taskForm.priority,
        projectId: taskForm.projectId || undefined,
        dueDate: taskForm.dueDate || undefined,
        estimatedHours: taskForm.estimatedHours ? parseFloat(taskForm.estimatedHours) : undefined,
      };

      if (editingTask) {
        await api.patch(`/tasks/${editingTask.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }

  async function deleteTask(id: string) {
    try {
      await api.delete(`/tasks/${id}`);
      setShowForm(false);
      setEditingTask(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  async function startTimer(taskId: string) {
    try {
      const { data } = await api.post(`/tasks/${taskId}/time-entries`, {
        startTime: new Date().toISOString(),
      });
      setActiveTimer(data.entry);
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  }

  async function stopTimer() {
    if (!activeTimer) return;
    try {
      await api.patch(`/tasks/time-entries/${activeTimer.id}`, {
        endTime: new Date().toISOString(),
      });
      setActiveTimer(null);
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/tasks/projects', projectForm);
      setShowProjectForm(false);
      setProjectForm({ name: '', description: '', color: '#3b82f6' });
      loadData();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Tasks"
        actions={
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'board' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm border-l ${viewMode === 'list' ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
              >
                List
              </button>
            </div>
            <button onClick={() => openNewTask()} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> New Task
            </button>
          </div>
        }
      />

      {/* Active timer banner */}
      {activeTimer && (
        <div className="card card-body mb-4 flex items-center justify-between bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-gray-900">Timer running: {activeTimer.task?.title}</p>
              <p className="text-xs text-gray-500">Started {format(new Date(activeTimer.startTime), 'h:mm a')}</p>
            </div>
          </div>
          <button onClick={stopTimer} className="btn-danger btn-sm">
            <Square className="h-3 w-3 mr-1" /> Stop
          </button>
        </div>
      )}

      {/* Project selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedProject('')}
          className={!selectedProject ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
        >
          All Projects
        </button>
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p.id)}
            className={selectedProject === p.id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            <span className="h-2 w-2 rounded-full mr-1.5 inline-block" style={{ backgroundColor: p.color || '#gray' }} />
            {p.name}
            {p.taskCounts && (
              <span className="ml-1.5 text-xs opacity-70">({p.taskCounts.total})</span>
            )}
          </button>
        ))}
        <button onClick={() => setShowProjectForm(true)} className="btn-ghost btn-sm">
          <Plus className="h-3 w-3 mr-1" /> Project
        </button>
      </div>

      {/* Project form */}
      {showProjectForm && (
        <div className="card mb-4 max-w-sm">
          <div className="card-body">
            <form onSubmit={createProject} className="space-y-3">
              <input className="input" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} placeholder="Project name" required />
              <div className="flex gap-2">
                <input type="color" value={projectForm.color} onChange={e => setProjectForm({...projectForm, color: e.target.value})} className="h-9 w-9 rounded cursor-pointer" />
                <button type="submit" className="btn-primary btn-sm">Create</button>
                <button type="button" onClick={() => setShowProjectForm(false)} className="btn-secondary btn-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h3 className="font-semibold">{editingTask ? 'Edit Task' : 'New Task'}</h3>
            </div>
            <div className="card-body">
              <form onSubmit={saveTask} className="space-y-3">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" rows={3} value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value as TaskStatus})}>
                      {statusColumns.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value as TaskPriority})}>
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Due Date</label>
                    <input className="input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Estimated Hours</label>
                    <input className="input" type="number" step="0.5" value={taskForm.estimatedHours} onChange={e => setTaskForm({...taskForm, estimatedHours: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="label">Project</label>
                  <select className="input" value={taskForm.projectId} onChange={e => setTaskForm({...taskForm, projectId: e.target.value})}>
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary">{editingTask ? 'Update' : 'Create'}</button>
                  {editingTask && (
                    <>
                      {!activeTimer || activeTimer.taskId !== editingTask.id ? (
                        <button type="button" onClick={() => { startTimer(editingTask.id); setShowForm(false); }} className="btn-secondary">
                          <Play className="h-3 w-3 mr-1" /> Start Timer
                        </button>
                      ) : null}
                      <button type="button" onClick={() => deleteTask(editingTask.id)} className="btn-danger">Delete</button>
                    </>
                  )}
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusColumns.map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{statusLabels[status]}</h3>
                  <span className="text-xs text-gray-400">{columnTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => openEditTask(task)}
                      className="card card-body cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          {task.project && (
                            <p className="text-xs text-gray-500 mt-0.5">{task.project.name}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`badge text-xs ${priorityColors[task.priority]}`}>{task.priority}</span>
                            {task.dueDate && (
                              <span className="text-xs text-gray-400">
                                {format(new Date(task.dueDate), 'MMM d')}
                              </span>
                            )}
                            {task.children && task.children.length > 0 && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <ChevronRight className="h-3 w-3" /> {task.children.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => openNewTask(status)}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus className="h-3 w-3 inline mr-1" /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Assignees</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-500 py-8">No tasks</td></tr>
                ) : tasks.map(task => (
                  <tr key={task.id} className="cursor-pointer" onClick={() => openEditTask(task)}>
                    <td className="font-medium">{task.title}</td>
                    <td className="text-gray-500">{task.project?.name || '-'}</td>
                    <td>
                      <select
                        className="text-xs rounded-full px-2 py-1 border-0 cursor-pointer"
                        value={task.status}
                        onChange={e => { e.stopPropagation(); updateTaskStatus(task.id, e.target.value as TaskStatus); }}
                        onClick={e => e.stopPropagation()}
                      >
                        {statusColumns.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge text-xs ${priorityColors[task.priority]}`}>{task.priority}</span></td>
                    <td className="text-gray-500">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '-'}</td>
                    <td>
                      <div className="flex -space-x-1">
                        {task.assignments?.map(a => (
                          <div key={a.user.id} className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center border-2 border-white" title={`${a.user.firstName} ${a.user.lastName}`}>
                            {a.user.firstName[0]}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {(!activeTimer || activeTimer.taskId !== task.id) && (
                        <button
                          onClick={e => { e.stopPropagation(); startTimer(task.id); }}
                          className="btn-ghost btn-sm"
                          title="Start timer"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
