# API Testing with Playwright — FlexiData SIS

Framework kiểm thử API tự động sử dụng [Playwright Test](https://playwright.dev/docs/api-testing) cho hệ thống **FlexiData SIS**.

---

## Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

---

## Cài đặt

```bash
git clone <repo-url>
cd API_Testing_Playwright
npm install
```

---

## Biến môi trường (`.env`)

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

| Biến              | Mô tả                             | Ví dụ                                    |
|-------------------|-----------------------------------|------------------------------------------|
| `BASE_URL`        | URL gốc của API                   | `https://sis-qc-host.sis.flexiapp.cloud` |
| `API_USERNAME`    | Tài khoản đăng nhập               | `phuong.tran`                            |
| `API_PASSWORD`    | Mật khẩu đăng nhập                | `Admin@123`                              |
| `CLIENT_ID`       | OAuth2 client_id                  | `StudentInfoSystem_App`                  |
| `SCOPE`           | OAuth2 scope                      | `offline_access StudentInfoSystem`       |
| `campus_id`       | UUID của campus test              | `1efa96ed-64bc-196e-f405-3a1902691aca`   |
| `campus_code`     | Mã campus test                    | `Phuong_Test`                            |
| `schoolyear_id`   | UUID của năm học                  | `14065bb6-c5f3-9df1-3f97-3a1ad675fb10`   |
| `schoolyear_code` | Mã năm học                        | `25-26`                                  |

> File `.env` **không được commit** lên git. Xem `.env.example` để biết template.

---

## Biến global (state dùng chung giữa các test)

Các ID được tạo ra trong quá trình test (studentId, contactId, …) được lưu tạm vào:

```
.auth/student-state.json
```

File này do `saveState()` / `loadState()` trong [`tests/api/student.spec.js`](tests/api/student.spec.js) quản lý — tự sinh khi chạy test, **không commit**.

Token xác thực được lưu ở:

```
.auth/token.json
```

Được sinh bởi [`tests/global-setup.js`](tests/global-setup.js) và xóa bởi `global-teardown.js` sau khi suite kết thúc.

---

## Cấu trúc project

```
API_Testing_Playwright/
├── playwright.config.js               # Cấu hình: globalSetup, baseURL, reporter
├── package.json
├── .env.example                       # Template biến môi trường
├── .env                               # Biến môi trường (không commit)
│
├── .auth/                             # Sinh tự động, không commit
│   ├── token.json                     # Access token (TTL = hết ngày)
│   └── student-state.json             # State IDs dùng chung giữa các test
│
├── utils/
│   ├── apiHelper.js                   # Wrapper HTTP: GET / POST / PUT / PATCH / DELETE
│   └── schemaValidator.js             # Kiểm tra schema của response
│
└── tests/
    ├── global-setup.js                # Health check + lấy token (chạy 1 lần trước suite)
    ├── global-teardown.js             # Xóa token sau suite
    ├── fixtures/
    │   ├── testData.js                # Payload builder cho từng API
    │   └── authFixture.js             # Custom fixture: authedRequest, accessToken
    └── api/
        ├── 00_preconditions.spec.js   # Health check + token validation
        ├── student.spec.js            # Test Student API (toàn bộ CRUD)
        └── event.spec.js              # Test Event API (CRUD + negative tests)
```

---

## Luồng thực thi

```
npm test
   │
   ├── [Global Setup]  global-setup.js
   │      ├── GET  https://sis-qc.sis.flexiapp.cloud/  → health check
   │      └── POST /connect/token                      → lưu token vào .auth/token.json
   │
   ├── [Test 00]  00_preconditions.spec.js
   │      ├── Health check
   │      ├── Token acquisition
   │      └── Token readable & not expired
   │
   ├── [Test Suite]  student.spec.js  (chạy serial)
   │      └── xem chi tiết bên dưới
   │
   └── [Global Teardown]  global-teardown.js
          └── Xóa .auth/token.json
```

---

## APIs đã test — Student (`student.spec.js`)

Test suite chạy **serial** (theo thứ tự), mỗi bước phụ thuộc kết quả bước trước.

---

### Student

**1. `POST /api/app/student` — Tạo mới học sinh**
- status `200`
- content-type chứa `application/json`
- `body.id` hợp lệ UUID
- Các field khớp payload: `code`, `campusId`, `gender`, `status`, `firstName`, `lastName`, `ethnicGroup`

**2. `GET /api/app/student/:id` — Verify sau khi tạo**
- status `200`
- `id` và `code` khớp với record vừa tạo
- `firstName`, `lastName`, `campusId`, `gender`, `status`, `ethnicGroup`, `nationality` đúng giá trị
- `gender` là kiểu `number`, `dob` là kiểu `string`

**3. `PUT /api/app/student/:id` — Cập nhật học sinh**
- status `200`

**4. `GET /api/app/student/:id` — Verify sau khi update**
- status `200`
- Các field **đã đổi**: `firstName`, `lastName`, `phoneNumber`, `idCardNumber`, `nationality`
- Các field **giữ nguyên**: `id`, `code`, `campusId`, `status`

---

### Student Address (địa chỉ học sinh)

**5. `POST /api/app/student/student-addresses/:campusId` — Tạo mới địa chỉ HS**
- status `200`
- content-type chứa `application/json`

**6. `GET /api/app/student/student-address-with-details?studentId=…` — Verify địa chỉ vừa tạo**
- status `200`
- `totalCount` tăng so với trước
- Tìm thấy record theo giá trị `address`
- `studentId` khớp, `addressId` hợp lệ UUID

**7. `POST /api/app/student/student-addresses/:campusId` — Cập nhật địa chỉ HS**
- status `200`

**8. `GET /api/app/student/student-address-with-details?studentId=…` — Verify địa chỉ sau update**
- status `200`
- Tìm thấy record với `address` và `quarter` mới
- `totalCount` không tăng thêm (update, không tạo record mới)

---

### Student Contact (người thân / phụ huynh)

**9. `POST /api/app/student/student-contact` — Tạo người thân cho HS**
- status `200`
- content-type chứa `application/json`

**10. `GET /api/app/student/student-contact-with-detail?studentId=…` — Verify người thân vừa tạo**
- status `200`
- `totalCount > 0`
- Tìm thấy record theo `firstName` + `lastName`
- `studentId` khớp, `id` và `contactId` hợp lệ UUID
- `gender` là kiểu `number`

**11. `PUT /api/app/student/student-contact` — Cập nhật người thân**
- status `200`

**12. `GET /api/app/student/student-contact-with-detail?studentId=…` — Verify người thân sau update**
- status `200`
- Các field **đã đổi**: `firstName`, `lastName`, `phoneNumber`, `gender`
- Các field **giữ nguyên**: `studentId`, `contactId`
- `totalCount` không đổi

---

### Contact Address (địa chỉ phụ huynh)

**13. `POST /api/app/contact/contact-addresses/:campusId` — Tạo địa chỉ phụ huynh**
- status `200`
- content-type chứa `application/json`

**14. `GET /api/app/contact/contact-address-with-details?contactId=…` — Verify địa chỉ PH vừa tạo**
- status `200`
- `totalCount > 0`
- Tìm thấy record theo giá trị `address`
- `contactId` khớp, `addressId` hợp lệ UUID

**15. `POST /api/app/contact/contact-addresses/:campusId` — Cập nhật địa chỉ phụ huynh**
- status `200`

**16. `GET /api/app/contact/contact-address-with-details?contactId=…` — Verify địa chỉ PH sau update**
- status `200`
- Tìm thấy record với `address` và `quarter` mới
- `totalCount` không tăng thêm

---

### Cleanup (xóa dữ liệu — thứ tự ngược)

**17. `DELETE /api/app/contact/contact-addresses?contactId=…&addressId=…` — Xóa địa chỉ phụ huynh**
- status `204`

**18. `GET /api/app/contact/contact-address-with-details?contactId=…` — Verify địa chỉ PH đã xóa**
- status `200`
- Record không còn trong danh sách
- `totalCount` giảm 1

**19. `DELETE /api/app/student/:studentContactId/student-contacts/:studentId` — Xóa người thân**
- status `204`

**20. `GET /api/app/student/student-contact-with-detail?studentId=…` — Verify người thân đã xóa**
- status `200`
- Record không còn trong danh sách
- `totalCount` giảm 1

**21. `DELETE /api/app/student/student-addresses?studentId=…&addressId=…` — Xóa địa chỉ học sinh**
- status `204`

**22. `GET /api/app/student/student-address-with-details?studentId=…` — Verify địa chỉ HS đã xóa**
- status `200`
- Record không còn trong danh sách
- `totalCount` giảm 1

**23. `DELETE /api/app/student/:id` — Xóa học sinh**
- status `204`

**24. `GET /api/app/student/:id` — Verify học sinh đã xóa**
- status `404`

---

## APIs đã test — Event (`event.spec.js`)

Test suite chạy **serial**. Dùng chung `campus_id` từ file `.env`.

---

### Happy path

**1. `POST /api/app/event` — Tạo mới sự kiện 1**
- Response time < 2000ms
- status `200` hoặc `201`
- `body.id` hợp lệ UUID
- Lưu `eventId`, `eventTitle` vào state

**2. `POST /api/app/event` — Tạo mới sự kiện 2**
- Response time < 2000ms
- status `200` hoặc `201`
- `body.id` hợp lệ UUID
- Lưu `eventId2`, `eventTitle2` vào state

**3. `POST /api/app/event` — Tạo sự kiện trùng tên với sự kiện 2**
- Response time < 2000ms
- status `200` hoặc `201` (hệ thống cho phép tên trùng)
- `body.id` hợp lệ UUID
- Lưu `duplicatedEventId` vào state

**4. `GET /api/app/event/:id?campusId=…` — Verify sự kiện 1 vừa tạo**
- Response time < 2000ms
- status `200` hoặc `201`
- `body.id` khớp `eventId`
- `body.title` khớp `eventTitle`

**5. `PUT /api/app/event/:id` — Cập nhật sự kiện 1**
- Response time < 2000ms
- status `200` hoặc `201`

**6. `DELETE /api/app/event/multiple-events?ids=…` — Xóa sự kiện 1**
- status `200` hoặc `204`

**7. `GET /api/app/event/:id?campusId=…` — Verify sự kiện 1 đã xóa**
- status `200`, `400`, hoặc `404`

---

### Negative tests

**8. `POST /api/app/event` — Thiếu `title`**
- status `400`, `422`, hoặc `500`

**9. `POST /api/app/event` — Thiếu `campusId`**
- status `400`, `404`, hoặc `422`

**10. `POST /api/app/event` — Body rỗng**
- status `400`, `415`, hoặc `422`

**11. `GET /api/app/event/11111111-…` — ID không tồn tại**
- status `200`
- `body.title` là `null`

**12. `GET /api/app/event/:id` — Không có token**
- status `401` hoặc `403`

---

### Cleanup

**13. `DELETE /api/app/event/multiple-events?ids=…&ids=…` — Xóa sự kiện 2 + sự kiện trùng tên**
- status `200` hoặc `204`

**14. `GET /api/app/event/:id` — Verify sự kiện 2 đã xóa**
- status `200`, `400`, hoặc `404`

---

## Chạy tests

```bash
# Chạy toàn bộ test suite
npm test

# Chạy riêng Student API
npx playwright test tests/api/student.spec.js

# Chạy riêng Event API
npx playwright test tests/api/event.spec.js

# Chạy với filter tên test
npx playwright test --grep "POST /student"

# Override BASE_URL
BASE_URL=https://staging-api.example.com npm test
```

---

## Xem báo cáo

```bash
npm run report
```

Hoặc xem file JSON tại `reports/results.json`.

---

## Xác thực (Authentication)

Token lấy tự động qua `POST /connect/token` (password grant) trong `global-setup.js` trước khi suite chạy. Token được cache vào `.auth/token.json` và tái sử dụng trong ngày nếu còn hạn. Header `Authorization: Bearer <token>` được inject thủ công trong mỗi request.

---

## Tech stack

| Công cụ         | Phiên bản | Mục đích              |
|-----------------|-----------|-----------------------|
| Playwright Test | ^1.52.0   | API testing framework |
| dotenv          | latest    | Đọc biến môi trường   |
| Node.js         | >= 18     | Runtime               |
