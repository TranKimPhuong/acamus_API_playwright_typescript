require('dotenv').config();

function generateCode(prefix) {
  return `${prefix}-PW-${Date.now()}`;
}

// ── Student ──────────────────────────────────────────────────────────────────
function newStudent(overrides = {}) {
  const code = generateCode('HS');
  return {
    code,
    firstName:  'Trần',
    middleName: 'A',
    lastName:   'Bach',
    gender:     1,
    status:     1,
    studentAddressWithDetailCreateInputs: [],
    dob:                '2010-03-27T17:00:00Z',
    enrollmentDate:     new Date().toISOString(),
    ethnicGroup:        'Kinh',
    religion:           'Không',
    nationality:        'Việt Nam',
    phoneNumber:        '0291992',
    schoolEmailAddress: `${code}@email.com`,
    idIssuedDate:       '2025-03-27T17:00:00Z',
    idCardNumber:       '079266261718',
    campusId:           process.env.campus_id || '',
    ...overrides,
  };
}

function updatedStudent(code, overrides = {}) {
  const campusCode = process.env.campus_code || '';
  return {
    code,
    firstName:            'Trần update',
    middleName:           'A update',
    lastName:             'Bach update',
    preferredName:        'update',
    gender:               1,
    title:                '',
    dob:                  '2015-06-22T00:00:00Z',
    phoneNumber:          '2132323',
    personalEmailAddress: 'test@gmail.com',
    schoolEmailAddress:   'testschool@flexschool.vn',
    nationality:          'Vietnamese',
    ethnicGroup:          'Kinh',
    address:              '',
    ward:                 '',
    districtId:           null,
    provinceId:           null,
    countryId:            null,
    enrollmentDate:       new Date().toISOString(),
    enrollmentSchoolYearId:  null,
    enrollmentSemesterId:    null,
    status:               1,
    sisUserId:            `${campusCode}.${code}`,
    vnEduStudentCode:     'VNEDU_2211445544',
    moetCode:             'MOET_CODE01',
    personalId:           null,
    idCardNumber:         '147859623147',
    idIssuedDate:         '2020-06-22T00:00:00Z',
    idExpiryDate:         null,
    idIssuedPlace:        null,
    remarks:              null,
    religion:             'KHÔNG',
    region:               null,
    priorityType:         null,
    emergencyContactPhone:            null,
    emergencyContactRelationshipName: null,
    emergencyContactName:             null,
    ...overrides,
  };
}

// ── Student Address ───────────────────────────────────────────────────────────
function newStudentAddress(studentId, overrides = {}) {
  return [
    {
      locationUnitIds: [
        '2fa8aa47-0e37-950d-46b7-3a1d4b93ec74',
        'f9e0ef7a-c46e-ffaf-227f-3a1d4b93ec9f',
        '58a3a543-4fc3-78ad-0e42-3a1d4b94182b',
      ],
      addressId:     '',
      quarter:       'KP19',
      address:       '40/1 Nguyễn văn đậu',
      addressTypeId: '305f75e3-1b06-f6cf-4c78-3a1d3aefd666',
      studentId,
      ...overrides,
    },
  ];
}

function updatedStudentAddress(studentId, addressId, addressTypeId, overrides = {}) {
  return [
    {
      locationUnitIds: [
        '2fa8aa47-0e37-950d-46b7-3a1d4b93ec74',
        'd4d8e58e-55f3-c675-6f1f-3a1d4b93ecc1',
        'e48aa3c6-31bd-bce6-4cf9-3a1d4b94456e',
        '',
      ],
      addressId,
      quarter:       'KP19_update',
      address:       '40/1 Nguyễn văn đậu_update',
      addressTypeId,
      studentId,
      ...overrides,
    },
  ];
}

// ── Student Contact ───────────────────────────────────────────────────────────
function newStudentContact(studentId, overrides = {}) {
  const campusCode  = process.env.campus_code || '';
  const contactCode = generateCode('CT');
  return {
    studentId,
    contactTypeId:          '299f5ac2-737f-a95f-affd-3a1954e97afc',
    gender:                 0,
    isParentalResponsibility: false,
    isEmergencyContact:     true,
    isMainContact:          true,
    code:                   `${campusCode}.${contactCode}`,
    lastName:               'PH',
    middleName:             'V',
    firstName:              'Hân',
    phoneNumber:            '1234687',
    ...overrides,
  };
}

function updatedStudentContact(studentContactId, studentId, contactId, overrides = {}) {
  const campusCode  = process.env.campus_code || '';
  const contactCode = generateCode('CT-UP');
  return {
    id:            studentContactId,
    studentId,
    contactId,
    contactTypeId: '3cbc45de-6d77-8f83-0cbc-3a1902691b1b',
    code:          `${campusCode}.${contactCode}`,
    firstName:     'Phan update',
    middleName:    'Văn update',
    lastName:      'Hân update',
    preferredName: 'abc',
    gender:        1,
    profession:    'NVV',
    placeOfWork:   'NV',
    titleId:       null,
    dob:           null,
    phoneNumber:   '34234234',
    telephoneNumber:          '',
    workTelephoneNumber:      '',
    personalEmailAddress:     '',
    nationality:              'Viet nam',
    ethnicGroup:              '',
    address:                  '',
    ward:                     '',
    districtId:               null,
    provinceId:               null,
    countryId:                null,
    sisUserId:                '',
    isParentalResponsibility: false,
    parentPortalUserId:       null,
    isEmergencyContact:       true,
    isMainContact:            true,
    ...overrides,
  };
}

// ── Contact Address ───────────────────────────────────────────────────────────
function newContactAddress(contactId, overrides = {}) {
  return [
    {
      locationUnitIds: [
        '2fa8aa47-0e37-950d-46b7-3a1d4b93ec74',
        '5adcca59-2f28-595c-8691-3a1d4b93ec87',
        'f5d3b7d4-f6f5-7449-5580-3a1d4b93ee3c',
        '',
      ],
      contactId,
      address:       '50 ngõ Láng',
      addressTypeId: '305f75e3-1b06-f6cf-4c78-3a1d3aefd666',
      ...overrides,
    },
  ];
}

function updatedContactAddress(contactId, addressId, addressTypeId, overrides = {}) {
  return [
    {
      locationUnitIds: [
        '2fa8aa47-0e37-950d-46b7-3a1d4b93ec74',
        'd4d8e58e-55f3-c675-6f1f-3a1d4b93ecc1',
        '51e55781-2264-9607-feb1-3a1d4b944511',
        '',
      ],
      contactId,
      addressId,
      quarter:       'KP1_update',
      address:       '444 ng van dau_update',
      addressTypeId,
      ...overrides,
    },
  ];
}

// ── Event ─────────────────────────────────────────────────────────────────────
const EVENT_CONTEXT_IDS = [
  'c3911e52-94a3-6be7-24b0-3a1954f49eef',
  '8a3cd30c-a0b3-dc20-5fe0-3a1954f49ef3',
  'e312eea7-96a1-334a-e193-3a1954f49ef8',
];

function newEvent(title, overrides = {}) {
  const today   = new Date();
  const nextDay = new Date();
  nextDay.setDate(today.getDate() + 1);
  return {
    campusId:          process.env.campus_id || '',
    title,
    content:           '<p>sự kiện này được tạo từ Playwright</p>',
    contextType:       'GradeLevel',
    contextIds:        EVENT_CONTEXT_IDS,
    publicationStatus: 'Published',
    startDate:         today.toISOString(),
    endDate:           nextDay.toISOString(),
    ...overrides,
  };
}

function updatedEvent(eventId, title, overrides = {}) {
  return {
    id:                eventId,
    campusId:          process.env.campus_id || '',
    title,
    content:           '<p>sự kiện được update từ Playwright</p>',
    contextType:       'GradeLevel',
    contextIds:        EVENT_CONTEXT_IDS,
    publicationStatus: 'Published',
    startDate:         '2026-02-27T14:12:47',
    endDate:           '2026-02-27T23:06:00',
    ...overrides,
  };
}

module.exports = {
  newStudent,
  updatedStudent,
  newStudentAddress,
  updatedStudentAddress,
  newStudentContact,
  updatedStudentContact,
  newContactAddress,
  updatedContactAddress,
  newEvent,
  updatedEvent,
};
