import { useState } from 'react';

interface TaskFormProps {
  onSubmit: (title: string, description?: string) => Promise<void>;
  onCancel?: () => void;
  existingTitles?: string[];
}

export function TaskForm({ onSubmit, onCancel, existingTitles = [] }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Tiêu đề không được bỏ trống');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(title.trim(), description.trim() || undefined);
      setTitle('');
      setDescription('');
      if (onCancel) onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo công việc');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra tiêu đề nhập vào có bị trùng với danh sách hiện có hay không (case-insensitive)
  const isDuplicate = title.trim() !== '' && existingTitles.includes(title.trim().toLowerCase());

  return (
    <form onSubmit={handleSubmit} className="sticky-card card-color-0" style={{ transform: 'none' }}>
      <div className="card-edit-form" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
        <input
          type="text"
          className="card-edit-title-input"
          placeholder="Tiêu đề công việc mới..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          disabled={loading}
          maxLength={255}
          autoFocus
        />
        
        {/* Cảnh báo trùng lặp nhẹ nhàng dưới tiêu đề */}
        {isDuplicate && (
          <div className="card-edit-warning">
            ⚠️ Công việc này đã tồn tại trong danh sách
          </div>
        )}

        <textarea
          className="card-edit-desc-input"
          placeholder="Mô tả chi tiết (tùy chọn)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          maxLength={1000}
        />
        {error && <div className="card-edit-error">{error}</div>}
        <div className="card-edit-buttons" style={{ marginTop: 'auto' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-edit-cancel"
              disabled={loading}
            >
              Hủy
            </button>
          )}
          <button type="submit" className="btn-edit-save" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </form>
  );
}
