import type { ITask, IUpdateTask } from '@todolist/shared';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: ITask[];
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRestore?: (id: number) => Promise<void>;
  onUpdate: (id: number, data: IUpdateTask) => Promise<void>;
  onViewHistory: (task: ITask) => void;
  loading?: boolean;
  onCreateClick?: () => void;
  showAddCard?: boolean;
  isCreating?: boolean;
  createForm?: React.ReactNode;
  existingTitles?: string[];
  isSelectMode?: boolean;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
}

export function TaskList({
  tasks,
  onToggle,
  onDelete,
  onRestore,
  onUpdate,
  onViewHistory,
  loading,
  onCreateClick,
  showAddCard = true,
  isCreating,
  createForm,
  existingTitles = [],
  isSelectMode = false,
  selectedIds = [],
  onToggleSelect,
}: TaskListProps) {
  if (loading) {
    return <div className="loading">Đang tải danh sách công việc...</div>;
  }

  // Số màu pastel khả dụng để đổi màu ngẫu nhiên cho thẻ ghi chú
  const totalColors = 6;

  return (
    <div className="sticky-grid">
      {/* Hiển thị form tạo mới ở đầu lưới làm 1 phần tử của Grid */}
      {isCreating && createForm}

      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onRestore={onRestore}
          onUpdate={onUpdate}
          onViewHistory={onViewHistory}
          colorIndex={task.id % totalColors}
          existingTitles={existingTitles}
          isSelectMode={isSelectMode}
          isSelected={selectedIds.includes(task.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}

      {showAddCard && onCreateClick && (
        <div className="sticky-card sticky-card-add" onClick={onCreateClick}>
          <div className="sticky-card-add-content">
            <span className="sticky-card-add-icon">+</span>
            <span className="sticky-card-add-text">Tạo ghi chú mới</span>
          </div>
        </div>
      )}
    </div>
  );
}
