const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loadCourses, seedBlock, extractFromMigration, MIGRATION } = require('../scripts/gen-courses-seed.cjs');

test('the course seed in the migration matches src/data/courses.ts exactly', () => {
  const inMigration = extractFromMigration(fs.readFileSync(MIGRATION, 'utf8'));
  assert.ok(inMigration, 'migration has the seed markers');
  assert.equal(inMigration, seedBlock(loadCourses()),
    'courses.ts and the migration have drifted apart — run: node scripts/gen-courses-seed.cjs --write');
});

test('every course has 18 pars that add up to total_par, and ids are unique', () => {
  const courses = loadCourses();
  assert.equal(courses.length, 266);
  assert.equal(new Set(courses.map(c => c.id)).size, courses.length);
  for (const c of courses) {
    assert.equal(c.holes.length, 18, c.id);
    assert.equal(c.holes.reduce((s, h) => s + h.par, 0), c.total_par, `${c.id} total_par`);
    assert.ok(c.holes.every(h => h.par >= 3 && h.par <= 6), `${c.id} par range`);
  }
});

test('names with apostrophes are escaped in the generated SQL', () => {
  const block = seedBlock([{ id: 'x', name: "O'Neil's GC", city: 'A', state: 'B', course_rating: 70.1, slope_rating: 120, total_par: 72,
    holes: Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, par: 4 })) }]);
  assert.match(block, /'O''Neil''s GC'/);
});
