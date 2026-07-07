# Dự án Quản lý Công việc (Todo List Monorepo)

Ứng dụng quản lý công việc (Todo List) hoàn chỉnh với kiến trúc **NestJS** ở backend và **React** ở frontend, được tổ chức dưới dạng monorepo chia sẻ DTO và kiểu dữ liệu (Types).

## Các Tính năng Chính

### 1. Giao diện người dùng (React + Vite)
- **Thiết kế Bảng ghi chú (Sticky Wall):** Giao diện trực quan lấy cảm hứng từ bảng ghi chú vật lý, sử dụng hệ màu pastel nhẹ nhàng, hiện đại và thân thiện với người dùng.
- **Responsive toàn diện:** Tương thích tốt với mọi thiết kế màn hình. Sidebar sẽ tự động thu gọn thành Drawer trượt mượt mà trên thiết bị di động (Mobile).
- **Tìm kiếm & Bộ lọc nâng cao:**
  - Ô tìm kiếm thời gian thực (Debounced search 300ms).
  - Lọc công việc theo trạng thái: Tất cả, Hôm nay, Chưa xong, Đã xong.
  - Sắp xếp linh hoạt theo: Ngày tạo, Ngày sửa đổi, Tiêu đề (Tăng dần/Giảm dần).
- **Thùng rác (Xóa mềm):** Xem danh sách công việc đã xóa mềm và khôi phục chúng ngay lập tức từ giao diện.
- **Chỉnh sửa trực tiếp trên thẻ (Inline Edit):** Cho phép sửa trực tiếp tiêu đề và mô tả ngay trên thẻ ghi chú mà không cần mở Modal phức tạp.
- **Dòng thời gian lịch sử thay đổi (Audit Trail Timeline):** Xem chi tiết lịch sử cập nhật của từng công việc (Ai/Khi nào đã tạo, thay đổi tiêu đề từ gì sang gì, đổi trạng thái) hiển thị dưới dạng dòng thời gian chuyên nghiệp.

### 2. Backend (NestJS API)
- **CRUD đầy đủ:** Tạo mới, hiển thị, cập nhật, toggle và xóa công việc.
- **Tìm kiếm, Lọc, Phân trang & Sắp xếp dữ liệu:** Tích hợp trực tiếp ở tầng cơ sở dữ liệu.
- **Khóa tối ưu (Optimistic Locking):** Phát hiện xung đột chỉnh sửa đồng thời thông qua trường `version`, ngăn chặn ghi đè đè dữ liệu.
- **Xóa mềm (Soft Delete):** Đánh dấu công việc đã xóa thay vì xóa vĩnh viễn khỏi Database để hỗ trợ khôi phục.
- **Cập nhật hàng loạt (Bulk Operations) & Tính độc lập (Idempotency):** Hỗ trợ API cập nhật nhiều công việc cùng lúc, có cơ chế an toàn chống gửi trùng lặp nhờ header `Idempotency-Key`.
- **Validation chặt chẽ:** Sử dụng `class-validator` để lọc và từ chối các dữ liệu đầu vào không hợp lệ.
- **Tài liệu API Swagger:** Khám phá và thử nghiệm trực tiếp tại `/api`.

### 3. Shared Package (Thư viện dùng chung)
- Chia sẻ trực tiếp DTO, Types và Constants giữa Frontend và Backend nhằm đảm bảo tính đồng bộ mã nguồn và an toàn kiểu dữ liệu (Type safety).

---

## Công nghệ Sử dụng

| Tầng công nghệ | Công nghệ sử dụng |
| :--- | :--- |
| **Quản lý Monorepo** | pnpm workspaces + Turborepo |
| **Backend** | NestJS 11 |
| **Frontend** | React 19 + Vite |
| **Ngôn ngữ** | TypeScript |
| **Cơ sở dữ liệu** | SQLite (qua better-sqlite3) |
| **ORM** | TypeORM |
| **Validation** | class-validator |
| **API Docs** | Swagger / OpenAPI |
| **Kiểm thử** | Jest (Backend) + Vitest & React Testing Library (Frontend) |
| **Container hóa** | Docker + Docker Compose |

---

## Cấu trúc Thư mục Dự án

```
todolist/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── task/
│   │   │   │   ├── entities/   # Thực thể DB (Task, History, Idempotency)
│   │   │   │   ├── task.controller.ts
│   │   │   │   └── task.service.ts
│   │   │   └── main.ts
│   │   └── test/               # Bộ test Unit & E2E của Backend
│   │
│   └── web/                    # Frontend React + Vite
│       ├── src/
│       │   ├── components/     # Các UI Component (TaskForm, TaskItem, v.v.)
│       │   ├── hooks/          # Custom React hooks (useTasks)
│       │   ├── services/       # Client gọi API (taskApi)
│       │   ├── App.tsx         # Component chính & giao diện Sidebar
│       │   └── main.tsx
│       └── Dockerfile          # Nginx phục vụ SPA React
│
├── packages/
│   └── shared/                 # DTO và Types dùng chung
│
├── docker-compose.yml          # Triển khai Docker multi-container
├── package.json                # Cấu hình workspace gốc
├── pnpm-workspace.yaml
├── turbo.json
└── README.md                   # Tài liệu hướng dẫn
```

---

## Hướng dẫn Khởi chạy Dự án

Dự án hỗ trợ 2 cách chạy: **Khởi chạy thủ công (Manual)** và **Khởi chạy bằng Docker**.

---

### Cách 1: Khởi chạy thủ công (Manual Run)

#### Yêu cầu hệ thống
- **Node.js** >= 18
- **pnpm** >= 9

#### 1. Cài đặt các thư viện phụ thuộc
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
pnpm install
```

#### 2. Khởi chạy chế độ Development
Khởi chạy song song cả API Backend và Web Frontend:
```bash
pnpm dev
```
Hoặc khởi chạy riêng lẻ từng ứng dụng con:
```bash
# Chỉ chạy API Backend (http://localhost:3000)
pnpm dev:api

# Chỉ chạy Web Frontend (http://localhost:5173)
pnpm dev:web
```

Sau khi khởi chạy thành công, truy cập các địa chỉ sau:
- **Giao diện Web:** [http://localhost:5173](http://localhost:5173)
- **API Backend:** [http://localhost:3000](http://localhost:3000)
- **Swagger API Docs:** [http://localhost:3000/api](http://localhost:3000/api)

#### 3. Biên dịch bản phân phối Production (Build)
```bash
pnpm build
```

---

### Cách 2: Khởi chạy bằng Docker (Docker Run)

#### Yêu cầu hệ thống
- **Docker** và **Docker Compose** đã được cài đặt và đang chạy.

#### 1. Khởi chạy dự án
Chạy lệnh duy nhất sau tại thư mục gốc để tự động build và chạy cả hai dịch vụ:
```bash
docker-compose up --build
```

#### 2. Thông tin truy cập cổng kết nối
- **Giao diện Web:** [http://localhost:8080](http://localhost:8080)
- **API Backend:** [http://localhost:3000](http://localhost:3000)
- **Swagger API Docs:** [http://localhost:3000/api](http://localhost:3000/api)

---

## Hướng dẫn Chạy Kiểm thử (Tests)

Dự án hỗ trợ đầy đủ các bộ kiểm thử cho cả 2 ứng dụng backend và frontend:

```bash
# Chạy tất cả các bài test trong dự án (bao gồm cả frontend và backend)
pnpm test

# Chỉ chạy test của Backend (Jest Unit + Integration)
pnpm --filter @todolist/api test

# Chạy test E2E của Backend
pnpm --filter @todolist/api test:e2e

# Chạy test của Frontend (Vitest + Testing Library)
pnpm --filter @todolist/web test
```

---

## Danh sách API Endpoints chính

| Phương thức | Đường dẫn | Mô tả chức năng |
| :--- | :--- | :--- |
| `POST` | `/task` | Tạo mới một công việc |
| `GET` | `/task` | Lấy danh sách công việc (hỗ trợ search, filter, paginate, sort) |
| `GET` | `/task/:id` | Xem chi tiết công việc theo ID |
| `PATCH` | `/task/:id` | Cập nhật công việc (hỗ trợ optimistic locking) |
| `PATCH` | `/task/:id/toggle` | Đổi nhanh trạng thái hoàn thành |
| `DELETE` | `/task/:id` | Xóa mềm công việc (đưa vào thùng rác) |
| `POST` | `/task/:id/restore` | Khôi phục công việc đã xóa mềm |
| `PATCH` | `/task/bulk/update` | Cập nhật đồng thời hàng loạt công việc |
| `GET` | `/task/:id/history` | Lấy lịch sử thay đổi (Audit Trail) của công việc |

---

## Tác giả

- **Tên tác giả:** KhaiDev
- **Email liên hệ:** `khaidevcontact@gmail.com`
