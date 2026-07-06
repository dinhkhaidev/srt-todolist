import { TaskStatusFilter, TaskSortBy, TaskOrder } from '@todolist/shared';
import type { IQueryTask } from '@todolist/shared';

interface FilterBarProps {
  query: IQueryTask;
  onChange: (query: Partial<IQueryTask>) => void;
}

export function FilterBar({ query, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Status:</label>
        <select
          value={query.status || TaskStatusFilter.ALL}
          onChange={(e) => onChange({ status: e.target.value as TaskStatusFilter })}
        >
          <option value={TaskStatusFilter.ALL}>All</option>
          <option value={TaskStatusFilter.PENDING}>Pending</option>
          <option value={TaskStatusFilter.COMPLETED}>Completed</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Sort by:</label>
        <select
          value={query.sortBy || TaskSortBy.CREATED_AT}
          onChange={(e) => onChange({ sortBy: e.target.value as TaskSortBy })}
        >
          <option value={TaskSortBy.CREATED_AT}>Created Date</option>
          <option value={TaskSortBy.UPDATED_AT}>Updated Date</option>
          <option value={TaskSortBy.TITLE}>Title</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Order:</label>
        <select
          value={query.order || TaskOrder.DESC}
          onChange={(e) => onChange({ order: e.target.value as TaskOrder })}
        >
          <option value={TaskOrder.DESC}>Descending</option>
          <option value={TaskOrder.ASC}>Ascending</option>
        </select>
      </div>

      <div className="filter-group">
        <label>
          <input
            type="checkbox"
            checked={query.includeDeleted === 'true'}
            onChange={(e) => onChange({ includeDeleted: e.target.checked ? 'true' : undefined })}
          />
          Show deleted
        </label>
      </div>
    </div>
  );
}
