import { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { SearchBar } from './components/SearchBar';
import { Pagination } from './components/Pagination';
import { TaskStatusFilter, TaskSortBy, TaskOrder } from '@todolist/shared';
import type { ITask, ITaskHistory } from '@todolist/shared';
import { taskApi } from './services/taskApi';
import './App.css';

function App() {
  const {
    tasks,
    loading,
    error,
    query,
    createTask: apiCreateTask,
    updateTask: apiUpdateTask,
    toggleTask: apiToggleTask,
    deleteTask: apiDeleteTask,
    restoreTask: apiRestoreTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    bulkRestoreTasks,
    updateQuery,
  } = useTasks();

  // State quản lý Toast notifications
  interface IToast {
    id: number;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }
  const [toasts, setToasts] = useState<IToast[]>([]);

  const showToast = (message: string, type: IToast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Lấy danh sách tiêu đề các công việc đang hoạt động (không bị xóa mềm) để kiểm tra trùng
  const activeTaskTitles = tasks
    ? tasks.data
        .filter((t) => !t.deletedAt)
        .map((t) => t.title.trim().toLowerCase())
    : [];

  const createTask = async (title: string, description?: string) => {
    const isDuplicate = activeTaskTitles.includes(title.trim().toLowerCase());
    if (isDuplicate) {
      const confirmCreate = window.confirm(
        'Công việc này đã tồn tại trong danh sách. Bạn có chắc chắn vẫn muốn tạo trùng không?'
      );
      if (!confirmCreate) {
        return;
      }
      showToast('Tạo trùng công việc theo yêu cầu.', 'info');
    }
    try {
      await apiCreateTask(title, description);
      showToast('Tạo công việc mới thành công!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi tạo công việc', 'error');
      throw err;
    }
  };

  const updateTask = async (id: number, data: any) => {
    if (data.title) {
      const taskObj = tasks?.data.find((t) => t.id === id);
      if (taskObj && data.title.trim().toLowerCase() !== taskObj.title.trim().toLowerCase()) {
        const isDuplicate = activeTaskTitles.includes(data.title.trim().toLowerCase());
        if (isDuplicate) {
          const confirmUpdate = window.confirm(
            'Tên công việc mới trùng lặp với một công việc khác đang hoạt động. Bạn có chắc chắn vẫn muốn cập nhật không?'
          );
          if (!confirmUpdate) {
            return;
          }
          showToast('Cập nhật trùng công việc theo yêu cầu.', 'info');
        }
      }
    }
    try {
      await apiUpdateTask(id, data);
      showToast('Cập nhật công việc thành công!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật công việc', 'error');
      throw err;
    }
  };

  const toggleTask = async (id: number) => {
    try {
      const updated = await apiToggleTask(id);
      showToast(updated.completed ? 'Đã hoàn thành công việc! 🎉' : 'Đang thực hiện công việc.', 'success');
    } catch (err) {
      showToast('Lỗi thay đổi trạng thái', 'error');
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const taskObj = tasks?.data.find((t) => t.id === id);
      const isHardDelete = !!(taskObj && taskObj.deletedAt);
      await apiDeleteTask(id);
      showToast(isHardDelete ? 'Đã xóa vĩnh viễn công việc!' : 'Đã di chuyển công việc vào thùng rác!', 'info');
    } catch (err) {
      showToast('Lỗi xóa công việc', 'error');
    }
  };

  const restoreTask = async (id: number) => {
    try {
      await apiRestoreTask(id);
      showToast('Đã khôi phục công việc thành công!', 'success');
    } catch (err) {
      showToast('Lỗi khôi phục công việc', 'error');
    }
  };

  // Các state giao diện
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'deleted'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // States hỗ trợ chọn nhiều (Bulk Operations)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Xem lịch sử (Audit Trail)
  const [historyTask, setHistoryTask] = useState<ITask | null>(null);
  const [historyData, setHistoryData] = useState<ITaskHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Khi thay đổi tab lọc trên Sidebar
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsCreating(false);
    setIsSelectMode(false);
    setSelectedIds([]);

    // Cấu hình query gửi lên API tương ứng
    if (tab === 'all') {
      updateQuery({ status: TaskStatusFilter.ALL, includeDeleted: undefined, page: '1' });
    } else if (tab === 'pending') {
      updateQuery({ status: TaskStatusFilter.PENDING, includeDeleted: undefined, page: '1' });
    } else if (tab === 'completed') {
      updateQuery({ status: TaskStatusFilter.COMPLETED, includeDeleted: undefined, page: '1' });
    } else if (tab === 'deleted') {
      updateQuery({ status: TaskStatusFilter.ALL, includeDeleted: 'true', page: '1' });
    }
  };

  // Các handler hỗ trợ thao tác hàng loạt
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTasksList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasksList.map((t) => t.id));
    }
  };

  const handleBulkComplete = async (completed: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdateTasks(selectedIds, { completed });
      showToast(`Đã cập nhật trạng thái ${selectedIds.length} công việc!`, 'success');
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái hàng loạt', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const isTrash = activeTab === 'deleted';
    const confirmMsg = isTrash
      ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} công việc đã chọn? Hành động này không thể khôi phục.`
      : `Bạn có chắc chắn muốn đưa ${selectedIds.length} công việc đã chọn vào thùng rác?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await bulkDeleteTasks(selectedIds);
      showToast(`Đã xóa ${selectedIds.length} công việc thành công!`, 'success');
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      showToast('Lỗi xóa công việc hàng loạt', 'error');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkRestoreTasks(selectedIds);
      showToast(`Đã khôi phục ${selectedIds.length} công việc thành công!`, 'success');
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      showToast('Lỗi khôi phục công việc hàng loạt', 'error');
    }
  };

  // Search handler
  const handleSearch = (search: string) => {
    updateQuery({ search, page: '1' });
  };

  // Phân trang
  const handlePageChange = (page: number) => {
    updateQuery({ page: page.toString() });
  };

  // Xem lịch sử công việc
  const handleViewHistory = async (task: ITask) => {
    setHistoryTask(task);
    setHistoryLoading(true);
    try {
      const data = await taskApi.getHistory(task.id);
      setHistoryData(data);
    } catch (err) {
      console.error('Không thể lấy lịch sử công việc:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Đóng modal lịch sử
  const closeHistoryModal = () => {
    setHistoryTask(null);
    setHistoryData([]);
  };

  // Lọc dữ liệu client-side nếu cần (hiển thị Thùng rác)
  const getFilteredTasks = () => {
    if (!tasks) return [];

    let list = [...tasks.data];

    if (activeTab === 'deleted') {
      // API trả về cả task bình thường và xóa mềm khi includeDeleted='true'.
      // Ta lọc chỉ lấy các task thực sự đã bị xóa mềm (có deletedAt).
      list = list.filter((t) => !!t.deletedAt);
    }

    return list;
  };

  const filteredTasksList = getFilteredTasks();

  // Dịch lịch sử thay đổi sang tiếng Việt dạng Badge
  const renderHistoryBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <span className="timeline-badge create">Đã tạo</span>;
      case 'updated':
        return <span className="timeline-badge update">Cập nhật</span>;
      case 'toggled':
        return <span className="timeline-badge status">Đổi trạng thái</span>;
      case 'deleted':
        return <span className="timeline-badge delete">Xóa mềm</span>;
      case 'restored':
        return <span className="timeline-badge restore">Khôi phục</span>;
      default:
        return <span className="timeline-badge">{action}</span>;
    }
  };

  const getHistoryActionDescription = (action: string) => {
    switch (action) {
      case 'created':
        return 'Tạo công việc ban đầu';
      case 'updated':
        return 'Chỉnh sửa nội dung chi tiết';
      case 'toggled':
        return 'Thay đổi trạng thái hoàn thành';
      case 'deleted':
        return 'Đã chuyển vào thùng rác';
      case 'restored':
        return 'Khôi phục lại bảng công việc';
      default:
        return 'Hành động không xác định';
    }
  };

  // Định dạng các thay đổi trong lịch sử (JSON changes)
  const renderHistoryChanges = (changesStr?: string) => {
    if (!changesStr) return null;
    try {
      const changes = JSON.parse(changesStr);
      return (
        <div className="timeline-changes-list">
          {Object.keys(changes).map((key) => {
            const val = changes[key];
            if (!val || typeof val !== 'object' || !('old' in val)) return null;

            let fieldName = key;
            let oldVal = val.old;
            let newVal = val.new;

            if (key === 'title') fieldName = 'Tiêu đề';
            if (key === 'description') fieldName = 'Mô tả';
            if (key === 'completed') {
              fieldName = 'Trạng thái';
              oldVal = val.old ? 'Đã hoàn thành' : 'Chưa hoàn thành';
              newVal = val.new ? 'Đã hoàn thành' : 'Chưa hoàn thành';
            }

            return (
              <div key={key} className="diff-item">
                <div className="diff-field-name">{fieldName}</div>
                <div className="diff-split">
                  {oldVal !== undefined && (
                    <div className="diff-line diff-old">
                      <span className="diff-indicator">-</span>
                      <span className="diff-text">{oldVal === null || oldVal === '' ? 'Trống' : String(oldVal)}</span>
                    </div>
                  )}
                  {newVal !== undefined && (
                    <div className="diff-line diff-new">
                      <span className="diff-indicator">+</span>
                      <span className="diff-text">{newVal === null || newVal === '' ? 'Trống' : String(newVal)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return <div className="timeline-changes-fallback">{changesStr}</div>;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Chào cú đêm 🦉';
    if (hour < 12) return 'Chào buổi sáng ☀️';
    if (hour < 18) return 'Chào buổi chiều 🌤️';
    return 'Chào buổi tối 🌙';
  };

  return (
    <div className="app-container">

      {/* Sidebar bên trái (chỉ hiển thị trên desktop >= 1025px) */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>
          </span>
          Sticky Wall
        </div>

        <SearchBar
          value={query.search || ''}
          onChange={handleSearch}
          placeholder="Tìm kiếm công việc..."
        />

        <div className="menu-section">
          <div className="menu-title">Công việc</div>
          <ul className="menu-list">
            <li
              className={`menu-item ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              <div className="menu-item-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                Tất cả công việc
              </div>
              <span className="menu-item-count">{activeTab === 'all' ? filteredTasksList.length : ''}</span>
            </li>
            <li
              className={`menu-item ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => handleTabChange('pending')}
            >
              <div className="menu-item-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Chưa hoàn thành
              </div>
              <span className="menu-item-count">{activeTab === 'pending' ? filteredTasksList.length : ''}</span>
            </li>
            <li
              className={`menu-item ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => handleTabChange('completed')}
            >
              <div className="menu-item-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Đã hoàn thành
              </div>
              <span className="menu-item-count">{activeTab === 'completed' ? filteredTasksList.length : ''}</span>
            </li>
            <li
              className={`menu-item ${activeTab === 'deleted' ? 'active' : ''}`}
              onClick={() => handleTabChange('deleted')}
            >
              <div className="menu-item-left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Thùng rác
              </div>
              <span className="menu-item-count">{activeTab === 'deleted' ? filteredTasksList.length : ''}</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', display: 'block', fontWeight: 500 }}>
            Quản lý công việc v1.0.0
          </span>
        </div>
      </aside>

      {/* Main Content bên phải */}
      <main className="main-content">
        <div className="main-header">
          <div>
            <div className="header-greeting">{getGreeting()}</div>
            <h1>
              {activeTab === 'all' && 'Bảng Công Việc'}
              {activeTab === 'pending' && 'Đang Thực Hiện'}
              {activeTab === 'completed' && 'Đã Hoàn Thành'}
              {activeTab === 'deleted' && 'Thùng Rác'}
            </h1>
            <div className="current-date-subtitle">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="header-actions-row">
            <button
              type="button"
              className={`select-mode-toggle-btn ${isSelectMode ? 'active' : ''}`}
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              title="Chọn nhiều công việc để xử lý hàng loạt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 11 12 14 22 4"></polyline></svg>
              <span>{isSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}</span>
            </button>

            {/* Thanh Sắp Xếp Tùy Chỉnh (Segmented Control Sort Toolbar) */}
            <div className="sort-toolbar">
              <span className="sort-label">Sắp xếp:</span>
              <div className="sort-group">
                <button
                  type="button"
                  className={`sort-option-btn ${query.sortBy === TaskSortBy.CREATED_AT ? 'active' : ''}`}
                  onClick={() => updateQuery({ sortBy: TaskSortBy.CREATED_AT, page: '1' })}
                >
                  Ngày tạo
                </button>
                <button
                  type="button"
                  className={`sort-option-btn ${query.sortBy === TaskSortBy.UPDATED_AT ? 'active' : ''}`}
                  onClick={() => updateQuery({ sortBy: TaskSortBy.UPDATED_AT, page: '1' })}
                >
                  Ngày sửa
                </button>
                <button
                  type="button"
                  className={`sort-option-btn ${query.sortBy === TaskSortBy.TITLE ? 'active' : ''}`}
                  onClick={() => updateQuery({ sortBy: TaskSortBy.TITLE, page: '1' })}
                >
                  Tiêu đề
                </button>
              </div>
              <button
                type="button"
                className="sort-direction-btn"
                onClick={() => updateQuery({ order: query.order === TaskOrder.DESC ? TaskOrder.ASC : TaskOrder.DESC, page: '1' })}
                title={query.order === TaskOrder.DESC ? 'Giảm dần' : 'Tăng dần'}
              >
                <svg
                  className={`sort-arrow ${query.order === TaskOrder.ASC ? 'asc' : 'desc'}`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                <span>{query.order === TaskOrder.DESC ? 'Giảm dần' : 'Tăng dần'}</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="sticky-grid-container">
          <TaskList
            tasks={filteredTasksList}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onRestore={activeTab === 'deleted' ? restoreTask : undefined}
            onUpdate={updateTask}
            onViewHistory={handleViewHistory}
            loading={loading}
            onCreateClick={() => setIsCreating(true)}
            showAddCard={activeTab !== 'deleted' && !isCreating && !isSelectMode}
            isCreating={isCreating}
            existingTitles={activeTaskTitles}
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            createForm={
              <TaskForm
                onSubmit={createTask}
                onCancel={() => setIsCreating(false)}
                existingTitles={activeTaskTitles}
              />
            }
          />
        </div>

        {/* Phân trang */}
        {tasks && tasks.meta.totalPages > 1 && (
          <div>
            <Pagination
              currentPage={Number(query.page) || 1}
              totalPages={tasks.meta.totalPages}
              onPageChange={handlePageChange}
            />
            <div className="pagination-info">
              Hiển thị {filteredTasksList.length} trên tổng số {tasks.meta.total} công việc
            </div>
          </div>
        )}
      </main>

      {/* ===== BOTTOM TAB BAR (Mobile/Tablet navigation) ===== */}
      <nav className="bottom-tab-bar">
        <button
          className={`bottom-tab-item ${activeTab === 'all' && !mobileSearchOpen ? 'active' : ''}`}
          onClick={() => { setMobileSearchOpen(false); handleTabChange('all'); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          <span>Tất cả</span>
        </button>
        <button
          className={`bottom-tab-item ${activeTab === 'pending' && !mobileSearchOpen ? 'active' : ''}`}
          onClick={() => { setMobileSearchOpen(false); handleTabChange('pending'); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Chưa xong</span>
        </button>

        {/* Nút Search ở giữa bottom tab */}
        <button
          className={`bottom-tab-item ${mobileSearchOpen ? 'active' : ''}`}
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>Tìm kiếm</span>
        </button>

        <button
          className={`bottom-tab-item ${activeTab === 'completed' && !mobileSearchOpen ? 'active' : ''}`}
          onClick={() => { setMobileSearchOpen(false); handleTabChange('completed'); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>Đã xong</span>
        </button>
        <button
          className={`bottom-tab-item ${activeTab === 'deleted' && !mobileSearchOpen ? 'active' : ''}`}
          onClick={() => { setMobileSearchOpen(false); handleTabChange('deleted'); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Thùng rác</span>
        </button>

        {/* Search panel trượt lên ngay phía trên thanh nav */}
        {mobileSearchOpen && (
          <div className="bottom-search-panel">
            <SearchBar
              value={query.search || ''}
              onChange={handleSearch}
              placeholder="Tìm kiếm công việc..."
            />
          </div>
        )}
      </nav>

      {/* Modal Lịch sử Thay đổi (Audit Trail) */}
      {historyTask && (
        <div className="modal-overlay" onClick={closeHistoryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Lịch sử thay đổi</h3>
              <button className="modal-close-btn" onClick={closeHistoryModal} aria-label="Đóng">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body">
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Công việc: <strong>{historyTask.title}</strong>
              </h4>

              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)' }}>
                  Đang tải lịch sử...
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)' }}>
                  Chưa có lịch sử ghi nhận.
                </div>
              ) : (
                <div className="timeline">
                  {historyData.map((history) => (
                    <div className="timeline-item" key={history.id}>
                      <span className="timeline-dot"></span>
                      <div className="timeline-action" style={{ display: 'flex', alignItems: 'center' }}>
                        {renderHistoryBadge(history.action)}
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {getHistoryActionDescription(history.action)}
                        </span>
                      </div>
                      {renderHistoryChanges(history.changes)}
                      <div className="timeline-date">
                        {new Date(history.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FLOATING BULK ACTION BAR ===== */}
      {isSelectMode && (
        <div className={`bulk-action-bar ${selectedIds.length > 0 ? 'visible' : ''}`}>
          <div className="bulk-action-bar-content">
            <div className="bulk-selected-info">
              <span>Đã chọn: <strong>{selectedIds.length}</strong> / {filteredTasksList.length}</span>
              <button className="btn-bulk-text" onClick={handleSelectAll}>
                {selectedIds.length === filteredTasksList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div className="bulk-action-buttons">
              {activeTab !== 'deleted' ? (
                <>
                  <button
                    className="btn-bulk-action btn-bulk-success"
                    onClick={() => handleBulkComplete(true)}
                    disabled={selectedIds.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>Hoàn thành</span>
                  </button>
                  <button
                    className="btn-bulk-action btn-bulk-warning"
                    onClick={() => handleBulkComplete(false)}
                    disabled={selectedIds.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>Chưa xong</span>
                  </button>
                  <button
                    className="btn-bulk-action btn-bulk-danger"
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Xóa</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-bulk-action btn-bulk-success"
                    onClick={handleBulkRestore}
                    disabled={selectedIds.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                    <span>Khôi phục</span>
                  </button>
                  <button
                    className="btn-bulk-action btn-bulk-danger"
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Xóa vĩnh viễn</span>
                  </button>
                </>
              )}
              <button className="btn-bulk-action btn-bulk-secondary" onClick={() => { setIsSelectMode(false); setSelectedIds([]); }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
              {toast.type === 'warning' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              )}
              {toast.type === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              )}
              {toast.type === 'info' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="9" x2="12.01" y2="9"></line></svg>
              )}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="toast-close-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
