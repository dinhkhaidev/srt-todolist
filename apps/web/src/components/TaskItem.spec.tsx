import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskItem } from './TaskItem';
import type { ITask } from '@todolist/shared';

const mockTask: ITask = {
  id: 1,
  title: 'Học lập trình React',
  description: 'Học các kiến thức cơ bản về hook và component',
  completed: false,
  version: 1,
  createdAt: new Date('2026-07-06T10:00:00Z'),
  updatedAt: new Date('2026-07-06T10:00:00Z'),
};

describe('Component TaskItem', () => {
  const onToggle = vi.fn();
  const onDelete = vi.fn();
  const onRestore = vi.fn();
  const onUpdate = vi.fn();
  const onViewHistory = vi.fn();

  it('Hiển thị đúng thông tin của task', () => {
    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    expect(screen.getByText('Học lập trình React')).toBeInTheDocument();
    expect(
      screen.getByText('Học các kiến thức cơ bản về hook và component')
    ).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('Gọi onToggle khi click checkbox', () => {
    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('Chuyển sang chế độ chỉnh sửa khi bấm nút Sửa', () => {
    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    const editBtn = screen.getByTitle('Chỉnh sửa');
    fireEvent.click(editBtn);

    // Xuất hiện các ô input thay cho text tĩnh
    const titleInput = screen.getByPlaceholderText('Tiêu đề...');
    const descInput = screen.getByPlaceholderText('Mô tả công việc...');

    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('Học lập trình React');
    expect(descInput).toHaveValue('Học các kiến thức cơ bản về hook và component');
  });

  it('Gọi onUpdate khi lưu thay đổi', async () => {
    onUpdate.mockResolvedValueOnce(undefined);

    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    // Chuyển sang mode sửa
    fireEvent.click(screen.getByTitle('Chỉnh sửa'));

    // Thay đổi tiêu đề
    const titleInput = screen.getByPlaceholderText('Tiêu đề...');
    fireEvent.change(titleInput, { target: { value: 'Học React nâng cao' } });

    // Click Lưu
    const saveBtn = screen.getByText('Lưu');
    fireEvent.click(saveBtn);

    expect(onUpdate).toHaveBeenCalledWith(1, {
      title: 'Học React nâng cao',
      description: 'Học các kiến thức cơ bản về hook và component',
      version: 1,
    });

    // Đợi ô input biến mất khi lưu thành công và đóng form sửa
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Tiêu đề...')).not.toBeInTheDocument();
    });
  });

  it('Khôi phục giá trị cũ và thoát chế độ sửa khi click Hủy', () => {
    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    // Chuyển sang mode sửa
    fireEvent.click(screen.getByTitle('Chỉnh sửa'));

    // Nhập giá trị mới nhưng click Hủy
    const titleInput = screen.getByPlaceholderText('Tiêu đề...');
    fireEvent.change(titleInput, { target: { value: 'Giá trị nháp' } });
    fireEvent.click(screen.getByText('Hủy'));

    // Trở về hiển thị tĩnh với tiêu đề cũ ban đầu
    expect(screen.getByText('Học lập trình React')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Tiêu đề...')).not.toBeInTheDocument();
  });

  it('Gọi onDelete khi click nút Xóa', () => {
    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    const deleteBtn = screen.getByTitle('Xóa mềm');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('Gọi onViewHistory khi click nút Lịch sử', () => {
    render(
      <TaskItem
        task={mockTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onRestore={onRestore}
        onUpdate={onUpdate}
        onViewHistory={onViewHistory}
        colorIndex={1}
      />
    );

    const historyBtn = screen.getByTitle('Xem lịch sử thay đổi');
    fireEvent.click(historyBtn);
    expect(onViewHistory).toHaveBeenCalledWith(mockTask);
  });
});
