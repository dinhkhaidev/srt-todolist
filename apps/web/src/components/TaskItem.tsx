import { useState, useEffect } from 'react';
import type { ITask, IUpdateTask } from '@todolist/shared';

interface TaskItemProps {
  task: ITask;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRestore?: (id: number) => Promise<void>;
  onUpdate: (id: number, data: IUpdateTask) => Promise<void>;
  onViewHistory: (task: ITask) => void;
  colorIndex: number;
  existingTitles?: string[];
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
}

export function TaskItem({
  task,
  onToggle,
  onDelete,
  onRestore,
  onUpdate,
  onViewHistory,
  colorIndex,
  existingTitles = [],
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: TaskItemProps) {
  const isDeleted = !!task.deletedAt;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đồng bộ hóa dữ liệu từ props vào state khi task thay đổi hoặc khi bật chế độ chỉnh sửa
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setError(null);
  }, [task.title, task.description, isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Tiêu đề không được bỏ trống');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        version: task.version,
      });
      setIsEditing(false);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('modified') || err.message.includes('version')) {
          setError('Phiên bản công việc đã bị thay đổi ở nơi khác. Vui lòng tải lại trang.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Không thể cập nhật công việc');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setError(null);
    setIsEditing(false);
  };

  const handleCardClick = () => {
    // Nếu đang ở chế độ chỉnh sửa, không can thiệp click
    if (isEditing) return;

    // Nếu đang chọn nhiều, bấm vào toàn bộ thẻ card sẽ chọn/bỏ chọn
    if (isSelectMode && onToggleSelect) {
      onToggleSelect(task.id);
    }
  };

  return (
    <div
      className={`sticky-card card-color-${colorIndex} ${task.completed ? 'completed' : ''} ${isDeleted ? 'deleted' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
      style={isSelectMode ? { cursor: 'pointer' } : undefined}
    >
      {isEditing ? (
        <div className="card-edit-form">
          <input
            type="text"
            className="card-edit-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            maxLength={255}
            placeholder="Tiêu đề..."
            autoFocus
          />
          {title.trim() !== '' &&
            existingTitles.includes(title.trim().toLowerCase()) &&
            title.trim().toLowerCase() !== task.title.trim().toLowerCase() && (
              <div className="card-edit-warning">
                ⚠️ Công việc này đã tồn tại trong danh sách
              </div>
          )}
          <textarea
            className="card-edit-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            maxLength={1000}
            placeholder="Mô tả công việc..."
          />
          {error && <div className="card-edit-error">{error}</div>}
          <div className="card-edit-buttons">
            <button onClick={handleCancel} className="btn-edit-cancel" disabled={loading}>
              Hủy
            </button>
            <button onClick={handleSave} className="btn-edit-save" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-header-row">
            {isSelectMode && onToggleSelect && (
              <label className="bulk-select-container" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(task.id)}
                />
                <span className="bulk-custom-checkbox"></span>
              </label>
            )}
            <h3 className="card-title">{task.title}</h3>
            {!isDeleted && !isSelectMode && (
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggle(task.id)}
                />
                <span className="custom-checkbox"></span>
              </label>
            )}
          </div>

          <div className="card-desc">
            {task.description || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Không có mô tả</span>}
          </div>

          <div className="card-footer">
            <div className="card-meta-info">
              <span className="card-version-badge">v{task.version}</span>
              <span>Tạo: {new Date(task.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              {task.updatedAt !== task.createdAt && (
                <span>Sửa: {new Date(task.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              )}
            </div>

            {!isSelectMode && (
              <div className="card-actions">
                {!isDeleted ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewHistory(task); }}
                      className="btn-card-action"
                      title="Xem lịch sử thay đổi"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"></path><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"></path></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                      className="btn-card-action"
                      title="Chỉnh sửa"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                      className="btn-card-action"
                      title="Xóa mềm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </>
                ) : (
                  <>
                    {onRestore && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRestore(task.id); }}
                        className="btn-card-action"
                        title="Khôi phục"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn công việc này? Hành động này không thể khôi phục.')) {
                          onDelete(task.id);
                        }
                      }}
                      className="btn-card-action"
                      title="Xóa vĩnh viễn"
                      style={{ color: '#dc2626' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
