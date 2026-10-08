import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays, rangesOverlap, isRangeFree, expandRange, currentBusyUntil, isBusyNow, todayStr,
} from '../supabase/functions/_shared/availability.js'

test('addDays: переходы через месяц и год', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})

test('rangesOverlap: границы включительные', () => {
  assert.equal(rangesOverlap('2026-10-10', '2026-10-12', '2026-10-12', '2026-10-14'), true)
  assert.equal(rangesOverlap('2026-10-10', '2026-10-12', '2026-10-13', '2026-10-14'), false)
  assert.equal(rangesOverlap('2026-10-10', '2026-10-20', '2026-10-12', '2026-10-13'), true)
})

test('isRangeFree', () => {
  const busy = [{ start: '2026-10-10', end: '2026-10-12' }]
  assert.equal(isRangeFree(busy, '2026-10-13', '2026-10-15'), true)
  assert.equal(isRangeFree(busy, '2026-10-12', '2026-10-15'), false)
  assert.equal(isRangeFree([], '2026-10-12', '2026-10-15'), true)
  assert.equal(isRangeFree(undefined, '2026-10-12', '2026-10-15'), true)
})

test('expandRange', () => {
  assert.deepEqual(expandRange('2026-10-30', '2026-11-01'), ['2026-10-30', '2026-10-31', '2026-11-01'])
  assert.deepEqual(expandRange('2026-10-10', '2026-10-10'), ['2026-10-10'])
})

test('currentBusyUntil / isBusyNow', () => {
  const ranges = [{ start: '2026-10-01', end: '2026-10-05' }, { start: '2026-10-08', end: '2026-10-12' }]
  assert.equal(currentBusyUntil(ranges, '2026-10-09'), '2026-10-12')
  assert.equal(currentBusyUntil(ranges, '2026-10-06'), null)
  assert.equal(isBusyNow(ranges, '2026-10-05'), true)
  assert.equal(isBusyNow([], '2026-10-05'), false)
})

test('todayStr: формат', () => {
  assert.match(todayStr(), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(todayStr(new Date(2026, 0, 5)), '2026-01-05')
})
