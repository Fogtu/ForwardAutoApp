import test from 'node:test'
import assert from 'node:assert/strict'
import {
  daysBetween, pricePerDayFor, totalPriceFor, quoteRental, normalizeTiers, matchTier,
} from '../supabase/functions/_shared/pricing.js'

test('daysBetween: включительно', () => {
  assert.equal(daysBetween('2026-10-10', '2026-10-10'), 1)
  assert.equal(daysBetween('2026-10-10', '2026-10-12'), 3)
  assert.equal(daysBetween('2026-02-27', '2026-03-02'), 4)
  assert.equal(daysBetween('2028-02-27', '2028-03-02'), 5)
})

test('daysBetween: некорректные данные дают 0', () => {
  assert.equal(daysBetween('', '2026-10-10'), 0)
  assert.equal(daysBetween('2026-10-12', '2026-10-10'), 0)
  assert.equal(daysBetween('мусор', '2026-10-10'), 0)
})

const tiers = [
  { minDays: 1, maxDays: 2, pricePerDay: 1000 },
  { minDays: 3, maxDays: 6, pricePerDay: 900 },
  { minDays: 7, maxDays: null, pricePerDay: 700 },
]

test('pricePerDayFor: выбор диапазона', () => {
  assert.equal(pricePerDayFor(1, tiers, 1200), 1000)
  assert.equal(pricePerDayFor(3, tiers, 1200), 900)
  assert.equal(pricePerDayFor(6, tiers, 1200), 900)
  assert.equal(pricePerDayFor(7, tiers, 1200), 700)
  assert.equal(pricePerDayFor(60, tiers, 1200), 700)
})

test('pricePerDayFor: без тарифов и с дырой — базовая цена', () => {
  assert.equal(pricePerDayFor(5, [], 1200), 1200)
  assert.equal(pricePerDayFor(5, undefined, 1200), 1200)
  assert.equal(pricePerDayFor(4, [{ minDays: 1, maxDays: 2, pricePerDay: 1 }], 1200), 1200)
})

test('pricePerDayFor: при пересечении побеждает больший minDays', () => {
  const overlap = [
    { minDays: 1, maxDays: null, pricePerDay: 1000 },
    { minDays: 5, maxDays: null, pricePerDay: 800 },
  ]
  assert.equal(pricePerDayFor(5, overlap, 1200), 800)
  assert.equal(pricePerDayFor(4, overlap, 1200), 1000)
  assert.equal(matchTier(5, overlap).minDays, 5)
})

test('totalPriceFor', () => {
  assert.equal(totalPriceFor(0, tiers, 1200), 0)
  assert.equal(totalPriceFor(-3, tiers, 1200), 0)
  assert.equal(totalPriceFor(3, tiers, 1200), 2700)
})

test('quoteRental: сервер и клиент считают одинаково', () => {
  const q = quoteRental({ startDate: '2026-10-10', endDate: '2026-10-16', tiers, priceDay: 1200 })
  assert.deepEqual(q, { days: 7, pricePerDay: 700, total: 4900, usedTier: true })
  const base = quoteRental({ startDate: '2026-10-10', endDate: '2026-10-10', tiers: [], priceDay: 1200 })
  assert.deepEqual(base, { days: 1, pricePerDay: 1200, total: 1200, usedTier: false })
  assert.equal(quoteRental({ startDate: '2026-10-12', endDate: '2026-10-10', tiers, priceDay: 1 }).total, 0)
})

test('normalizeTiers: snake_case → camelCase', () => {
  assert.deepEqual(normalizeTiers([{ min_days: 2, max_days: null, price_per_day: 500 }]), [
    { minDays: 2, maxDays: null, pricePerDay: 500 },
  ])
})
