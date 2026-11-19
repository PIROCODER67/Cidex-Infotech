// Run with: node --test worker/test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimate, missingFields } from '../src/pricing.js';
import { guardReply } from '../src/index.js';

const social = (platforms, posts, extra = {}) =>
  estimate('social', { platforms, posts, reels: 0, ...extra }, { usdInrRate: 94 });

test('social: 2 platforms need Advanced at any post count up to 35', () => {
  for (const posts of [15, 10, 5]) {
    const r = social(2, posts);
    assert.equal(r.status, 'estimate');
    assert.equal(r.lines[0].label, 'Social Media Advanced');
  }
});

test('social: 1 platform, 15 posts is Basic', () => {
  const r = social(1, 15);
  assert.equal(r.lines[0].label, 'Social Media Basic');
  assert.equal(r.lines[0].inr, 10000);
});

test('social: 100 platforms goes to the team', () => {
  assert.equal(social(100, 15).status, 'team');
});

test('social: reels always go to the team', () => {
  assert.equal(social(2, 17, { reels: 5 }).status, 'team');
  assert.equal(social(1, 4, { reels: 4 }).status, 'team');
});

test('website: interactive 6 pages with unanswered questions is not an estimate', () => {
  const answers = { website_type: 'interactive', pages: 6, contact_forms: 0 };
  const r = estimate('website', answers, { usdInrRate: 94 });
  assert.equal(r.status, 'need_info');
  assert.ok(missingFields('website', answers).includes('payment_gateway'));
});

test('guard: asks the next missing question instead of claiming an estimate', () => {
  const reply = guardReply('Great! The estimate is shown below.', 'website', ['payment_gateway'], null);
  assert.match(reply, /online payments/);
});

test('guard: says the estimate could not be made when complete but none exists', () => {
  const reply = guardReply('The estimate is shown below.', 'website', [], null);
  assert.match(reply, /couldn't generate your estimate/);
});

test('guard: leaves normal replies alone', () => {
  assert.equal(guardReply('How many pages do you need?', 'website', ['pages'], null), 'How many pages do you need?');
});

test('social: the estimate says what the package covers and that reels are separate', () => {
  const r = social(2, 10);
  assert.match(r.note, /fixed monthly price/);
  assert.match(r.note, /up to 35 feed posts on up to 3 platforms/);
  assert.match(r.note, /Reels and videos are not included/);
});
