const fs   = require('fs');
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '../.auth/student-state.json');

// Xóa state data sau mỗi lần chạy để tránh data cũ ảnh hưởng lần tiếp theo.
// Token KHÔNG bị xóa — global-setup tự bỏ qua nếu token hôm nay còn hạn.
module.exports = async function globalTeardown() {
  if (fs.existsSync(STATE_FILE)) {
    fs.rmSync(STATE_FILE);
    console.log('[Teardown] ✔ student-state.json đã xóa');
  }
};
