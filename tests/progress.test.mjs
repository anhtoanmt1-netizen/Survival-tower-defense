import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_ORDER, isUnlocked, unlockedIds, recordResult, sanitizeCleared, highestUnlocked } from '../src/config/progress.js';

test('mở khóa cấp độ: chỉ cấp 1 mở lúc đầu; thắng cấp N mới mở cấp N+1, đúng thứ tự', () => {
  assert.deepEqual(LEVEL_ORDER, ['easy', 'normal', 'hard', 'veryHard', 'nightmare']);
  assert.deepEqual(unlockedIds({}), ['easy']); assert.equal(isUnlocked('normal', {}), false);
  let c = recordResult({}, 'easy', true); assert.deepEqual(unlockedIds(c), ['easy', 'normal']); assert.equal(isUnlocked('hard', c), false);
  c = recordResult(c, 'normal', true); c = recordResult(c, 'hard', true); assert.equal(highestUnlocked(c), 'veryHard');
});
test('mở khóa: thua không mở; không thể "thắng" cấp đang khóa; không nhảy cóc; dữ liệu lưu bị sửa tay bị loại', () => {
  assert.deepEqual(recordResult({}, 'easy', false), {}); assert.deepEqual(recordResult({}, 'hard', true), {});
  assert.equal(isUnlocked('hard', { easy: true, hard: true }), false); assert.deepEqual(sanitizeCleared({ hard: true, nightmare: true }), {});
  assert.deepEqual(sanitizeCleared({ easy: true, hard: true }), { easy: true }); assert.equal(isUnlocked('không-tồn-tại', {}), false);
});
