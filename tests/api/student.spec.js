require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { ApiHelper }    = require('../../utils/apiHelper');
const {
  newStudent, updatedStudent,
  newStudentAddress, updatedStudentAddress,
  newStudentContact, updatedStudentContact,
  newContactAddress, updatedContactAddress,
} = require('../fixtures/testData');
const fs   = require('fs');
const path = require('path');

const BASE_URL   = process.env.BASE_URL || 'https://sis-qc-host.sis.flexiapp.cloud';
const STUDENT_EP = '/api/app/student';
const CONTACT_EP = '/api/app/contact';
const CAMPUS_ID  = process.env.campus_id || '';
const STATE_FILE = path.resolve(__dirname, '../../.auth/student-state.json');
const AUTH_FILE  = path.resolve(__dirname, '../../.auth/token.json');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function saveState(data) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const current = fs.existsSync(STATE_FILE)
    ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    : {};
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...data }));
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function getAccessToken() {
  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')).accessToken;
}

function authHeader(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

test.describe.serial('Student API', () => {
  let api;
  let token;
  let ctx;

  test.beforeAll(async ({ playwright }) => {
    token = getAccessToken();
    ctx = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
    });
    api = new ApiHelper(ctx);
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT
  // ════════════════════════════════════════════════════════════════════════════

  test('POST /student - tạo mới học sinh', async () => {
    const payload = newStudent();
    const { status, headers, body } = await api.post(STUDENT_EP, payload, authHeader(token));

    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
    expect(headers['content-type']).toContain('application/json');

    // id hợp lệ
    expect(body.id).toMatch(UUID_REGEX);

    // Các field khớp payload
    expect(body.code).toBe(payload.code);
    expect(body.campusId).toBe(payload.campusId);
    expect(body.gender).toBe(payload.gender);
    expect(body.status).toBe(payload.status);
    expect(body.firstName).toBe(payload.firstName);
    expect(body.lastName).toBe(payload.lastName);
    expect(body.ethnicGroup).toBe(payload.ethnicGroup);

    saveState({ studentId: body.id, studentCode: payload.code });
  });

  test('GET /student/:id - verify học sinh vừa tạo', async () => {
    const { studentId, studentCode } = loadState();
    expect(studentId).toBeTruthy();

    const { status, body } = await api.get(`${STUDENT_EP}/${studentId}`, authHeader(token));

    expect(status).toBe(200);

    // Identity
    expect(body.id).toBe(studentId);
    expect(body.code).toBe(studentCode);

    // Tất cả field quan trọng từ payload
    expect(body.firstName).toBe('Trần');
    expect(body.lastName).toBe('Bach');
    expect(body.campusId).toBe(CAMPUS_ID);
    expect(body.gender).toBe(1);
    expect(body.status).toBe(1);
    expect(body.ethnicGroup).toBe('Kinh');
    expect(body.nationality).toBe('Việt Nam');

    // Kiểu dữ liệu
    expect(typeof body.gender).toBe('number');
    expect(typeof body.dob).toBe('string');
  });

  test('PUT /student/:id - update thông tin học sinh', async () => {
    const { studentId, studentCode } = loadState();
    expect(studentId).toBeTruthy();

    const payload = updatedStudent(studentCode);
    const { status, body } = await api.put(
      `${STUDENT_EP}/${studentId}`,
      payload,
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
  });

  test('GET /student/:id - verify sau khi update', async () => {
    const { studentId, studentCode } = loadState();
    const { status, body } = await api.get(`${STUDENT_EP}/${studentId}`, authHeader(token));

    expect(status).toBe(200);

    // Field đã update
    expect(body.firstName).toBe('Trần update');
    expect(body.lastName).toBe('Bach update');
    expect(body.phoneNumber).toBe('2132323');
    expect(body.idCardNumber).toBe('147859623147');
    expect(body.nationality).toBe('Vietnamese');

    // Field KHÔNG update — phải giữ nguyên
    expect(body.id).toBe(studentId);
    expect(body.code).toBe(studentCode);
    expect(body.campusId).toBe(CAMPUS_ID);
    expect(body.status).toBe(1);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT ADDRESS
  // ════════════════════════════════════════════════════════════════════════════

  test('POST /student-addresses/:campusId - tạo mới địa chỉ HS', async () => {
    const { studentId } = loadState();
    expect(studentId).toBeTruthy();

    const { status, headers, body } = await api.post(
      `${STUDENT_EP}/student-addresses/${CAMPUS_ID}`,
      newStudentAddress(studentId),
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
    expect(headers['content-type']).toContain('application/json');
  });

  test('GET /student-address-with-details - verify địa chỉ HS vừa tạo', async () => {
    const { studentId } = loadState();
    const countBefore = loadState().studentAddressCount || 0;

    const { status, body } = await api.get(
      `${STUDENT_EP}/student-address-with-details?studentId=${studentId}&skipCount=0&maxResultCount=20`,
      authHeader(token),
    );

    expect(status).toBe(200);
    expect(body.totalCount).toBeGreaterThan(countBefore);

    // Tìm đúng record theo address, không dùng index cứng
    const addr = body.items.find(a => a.address === '40/1 Nguyễn văn đậu');
    expect(addr, 'Không tìm thấy địa chỉ vừa tạo').toBeTruthy();
    expect(addr.studentId).toBe(studentId);
    expect(addr.addressId).toMatch(UUID_REGEX);

    saveState({
      studentAddressId:     addr.addressId,
      studentAddressTypeId: addr.addressTypeId,
      studentAddressCount:  body.totalCount,
    });
  });

  test('POST /student-addresses/:campusId - update địa chỉ HS', async () => {
    const { studentId, studentAddressId, studentAddressTypeId } = loadState();
    expect(studentAddressId).toBeTruthy();

    const { status, body } = await api.post(
      `${STUDENT_EP}/student-addresses/${CAMPUS_ID}`,
      updatedStudentAddress(studentId, studentAddressId, studentAddressTypeId),
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
  });

  test('GET /student-address-with-details - verify địa chỉ HS sau update', async () => {
    const { studentId, studentAddressCount } = loadState();

    const { status, body } = await api.get(
      `${STUDENT_EP}/student-address-with-details?studentId=${studentId}&skipCount=0&maxResultCount=20`,
      authHeader(token),
    );

    expect(status).toBe(200);

    // Tìm đúng record theo address mới
    const addr = body.items.find(a => a.address === '40/1 Nguyễn văn đậu_update');
    expect(addr, 'Không tìm thấy địa chỉ sau update').toBeTruthy();
    expect(addr.quarter).toBe('KP19_update');
    expect(addr.studentId).toBe(studentId);

    // totalCount không tăng (update, không tạo mới record mới)
    expect(body.totalCount).toBe(studentAddressCount);

    // Lưu id (link id) để DELETE
    saveState({ studentAddressId: addr.id });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT CONTACT (người thân)
  // ════════════════════════════════════════════════════════════════════════════

  test('POST /student-contact - tạo người thân cho HS', async () => {
    const { studentId } = loadState();
    expect(studentId).toBeTruthy();

    const { status, headers, body } = await api.post(
      `${STUDENT_EP}/student-contact`,
      newStudentContact(studentId),
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
    expect(headers['content-type']).toContain('application/json');
  });

  test('GET /student-contact-with-detail - verify người thân vừa tạo', async () => {
    const { studentId } = loadState();

    const { status, body } = await api.get(
      `${STUDENT_EP}/student-contact-with-detail?studentId=${studentId}&skipCount=0&maxResultCount=100`,
      authHeader(token),
    );

    expect(status).toBe(200);
    expect(body.totalCount).toBeGreaterThan(0);

    // Tìm đúng record
    const contact = body.items.find(c => c.firstName === 'Hân' && c.lastName === 'PH');
    expect(contact, 'Không tìm thấy người thân vừa tạo').toBeTruthy();
    expect(contact.studentId).toBe(studentId);
    expect(contact.id).toMatch(UUID_REGEX);
    expect(contact.contactId).toMatch(UUID_REGEX);
    expect(typeof contact.gender).toBe('number');

    saveState({
      studentContactId:    contact.id,
      contactId:           contact.contactId,
      studentContactCount: body.totalCount,
    });
  });

  test('PUT /student-contact - cập nhật thông tin người thân', async () => {
    const { studentId, studentContactId, contactId } = loadState();
    expect(studentContactId).toBeTruthy();

    const { status, body } = await api.put(
      `${STUDENT_EP}/student-contact`,
      updatedStudentContact(studentContactId, studentId, contactId),
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
  });

  test('GET /student-contact-with-detail - verify người thân sau update', async () => {
    const { studentId, studentContactId, contactId, studentContactCount } = loadState();

    const { status, body } = await api.get(
      `${STUDENT_EP}/student-contact-with-detail?studentId=${studentId}&skipCount=0&maxResultCount=100`,
      authHeader(token),
    );

    expect(status).toBe(200);

    // Tìm đúng record
    const contact = body.items.find(c => c.id === studentContactId);
    expect(contact, 'Không tìm thấy người thân sau update').toBeTruthy();

    // Field đã update
    expect(contact.firstName).toBe('Phan update');
    expect(contact.lastName).toBe('Hân update');
    expect(contact.phoneNumber).toBe('34234234');
    expect(contact.gender).toBe(1);

    // Field KHÔNG update — phải giữ nguyên
    expect(contact.studentId).toBe(studentId);
    expect(contact.contactId).toBe(contactId);

    // totalCount không đổi
    expect(body.totalCount).toBe(studentContactCount);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTACT ADDRESS (địa chỉ phụ huynh)
  // ════════════════════════════════════════════════════════════════════════════

  test('POST /contact-addresses/:campusId - tạo địa chỉ phụ huynh', async () => {
    const { contactId } = loadState();
    expect(contactId).toBeTruthy();

    const { status, headers, body } = await api.post(
      `${CONTACT_EP}/contact-addresses/${CAMPUS_ID}`,
      newContactAddress(contactId),
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
    expect(headers['content-type']).toContain('application/json');
  });

  test('GET /contact-address-with-details - verify địa chỉ phụ huynh vừa tạo', async () => {
    const { contactId } = loadState();

    const { status, body } = await api.get(
      `${CONTACT_EP}/contact-address-with-details?contactId=${contactId}&skipCount=0&maxResultCount=20`,
      authHeader(token),
    );

    expect(status).toBe(200);
    expect(body.totalCount).toBeGreaterThan(0);

    // Tìm đúng record
    const addr = body.items.find(a => a.address === '50 ngõ Láng');
    expect(addr, 'Không tìm thấy địa chỉ PH vừa tạo').toBeTruthy();
    expect(addr.contactId).toBe(contactId);
    expect(addr.addressId).toMatch(UUID_REGEX);

    saveState({
      contactAddressId:     addr.addressId,
      contactAddressTypeId: addr.addressTypeId,
      contactAddressCount:  body.totalCount,
    });
  });

  test('POST /contact-addresses/:campusId - cập nhật địa chỉ phụ huynh', async () => {
    const { contactId, contactAddressId, contactAddressTypeId } = loadState();
    expect(contactAddressId).toBeTruthy();

    const { status, body } = await api.post(
      `${CONTACT_EP}/contact-addresses/${CAMPUS_ID}`,
      updatedContactAddress(contactId, contactAddressId, contactAddressTypeId),
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(200);
  });

  test('GET /contact-address-with-details - verify địa chỉ phụ huynh sau update', async () => {
    const { contactId, contactAddressCount } = loadState();

    const { status, body } = await api.get(
      `${CONTACT_EP}/contact-address-with-details?contactId=${contactId}&skipCount=0&maxResultCount=20`,
      authHeader(token),
    );

    expect(status).toBe(200);

    // Tìm đúng record
    const addr = body.items.find(a => a.address === '444 ng van dau_update');
    expect(addr, 'Không tìm thấy địa chỉ PH sau update').toBeTruthy();
    expect(addr.quarter).toBe('KP1_update');
    expect(addr.contactId).toBe(contactId);

    // totalCount không tăng
    expect(body.totalCount).toBe(contactAddressCount);

    // Lưu id (link id) để DELETE
    saveState({ contactAddressId: addr.id });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DELETE — dọn dữ liệu (thứ tự ngược lại: address → contact → student)
  // ════════════════════════════════════════════════════════════════════════════

  test('DELETE /contact-addresses - xóa địa chỉ phụ huynh', async () => {
    const { contactId, contactAddressId } = loadState();
    expect(contactAddressId).toBeTruthy();

    const { status, body } = await api.delete(
      `${CONTACT_EP}/contact-addresses?contactId=${contactId}&addressId=${contactAddressId}`,
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(204);
  });

  test('GET /contact-address-with-details - verify địa chỉ PH đã xóa', async () => {
    const { contactId, contactAddressId, contactAddressCount } = loadState();

    const { status, body } = await api.get(
      `${CONTACT_EP}/contact-address-with-details?contactId=${contactId}&skipCount=0&maxResultCount=20`,
      authHeader(token),
    );

    expect(status).toBe(200);
    // Không còn trong danh sách
    expect(body.items.some(a => a.id === contactAddressId), 'Địa chỉ PH phải đã bị xóa').toBe(false);
    // totalCount giảm 1
    expect(body.totalCount).toBe(contactAddressCount - 1);
  });

  test('DELETE /student-contacts - xóa người thân', async () => {
    const { studentContactId, studentId } = loadState();
    expect(studentContactId).toBeTruthy();

    const { status, body } = await api.delete(
      `${STUDENT_EP}/${studentContactId}/student-contacts/${studentId}`,
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(204);
  });

  test('GET /student-contact-with-detail - verify người thân đã xóa', async () => {
    const { studentId, studentContactId, studentContactCount } = loadState();

    const { status, body } = await api.get(
      `${STUDENT_EP}/student-contact-with-detail?studentId=${studentId}&skipCount=0&maxResultCount=100`,
      authHeader(token),
    );

    expect(status).toBe(200);
    // Không còn trong danh sách
    expect(body.items.some(c => c.id === studentContactId), 'Người thân phải đã bị xóa').toBe(false);
    // totalCount giảm 1
    expect(body.totalCount).toBe(studentContactCount - 1);
  });

  test('DELETE /student-addresses - xóa địa chỉ học sinh', async () => {
    const { studentId, studentAddressId } = loadState();
    expect(studentAddressId).toBeTruthy();

    const { status, body } = await api.delete(
      `${STUDENT_EP}/student-addresses?studentId=${studentId}&addressId=${studentAddressId}`,
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(204);
  });

  test('GET /student-address-with-details - verify địa chỉ HS đã xóa', async () => {
    const { studentId, studentAddressId, studentAddressCount } = loadState();

    const { status, body } = await api.get(
      `${STUDENT_EP}/student-address-with-details?studentId=${studentId}&skipCount=0&maxResultCount=20`,
      authHeader(token),
    );

    expect(status).toBe(200);
    // Không còn trong danh sách
    expect(body.items.some(a => a.id === studentAddressId), 'Địa chỉ HS phải đã bị xóa').toBe(false);
    // totalCount giảm 1
    expect(body.totalCount).toBe(studentAddressCount - 1);
  });

  test('DELETE /student/:id - xóa học sinh', async () => {
    const { studentId } = loadState();
    expect(studentId).toBeTruthy();

    const { status, body } = await api.delete(
      `${STUDENT_EP}/${studentId}`,
      authHeader(token),
    );
    expect(status, `body: ${JSON.stringify(body)}`).toBe(204);
  });

  test('GET /student/:id - verify học sinh đã xóa (404)', async () => {
    const { studentId } = loadState();

    const { status } = await api.get(
      `${STUDENT_EP}/${studentId}`,
      authHeader(token),
    );
    expect(status, 'Học sinh phải đã bị xóa — mong đợi 404').toBe(404);
  });
});
