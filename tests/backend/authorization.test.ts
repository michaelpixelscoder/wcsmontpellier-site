import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.*s')

async function setup() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const base = { status: 'active' as const, updatedAt: 1 }
    const member = await ctx.db.insert('users', { ...base, email: 'member@test.invalid', role: 'user' })
    const contributorA = await ctx.db.insert('users', { ...base, email: 'a@test.invalid', role: 'contributor' })
    const contributorB = await ctx.db.insert('users', { ...base, email: 'b@test.invalid', role: 'contributor' })
    const administrator = await ctx.db.insert('users', { ...base, email: 'admin@test.invalid', role: 'administrator' })
    const level = await ctx.db.insert('levels', { slug: 'test', label: 'Test', description: 'Test', sortOrder: 1, colorToken: 'test' })
    const season = await ctx.db.insert('seasons', { label: 'Test season', startsOn: '2026-01-01', endsOn: '2026-12-31', isCurrent: true })
    const listing = await ctx.db.insert('listings', {
      slug: 'owned-listing', kind: 'event', title: 'Owned listing', summary: 'Summary', description: 'Description',
      ownerUserId: contributorA, sourceUrl: 'https://example.com/source', status: 'published',
      verificationStatus: 'contributor_verified', updatedAt: 1, version: 1,
    })
    await ctx.db.insert('events', { listingId: listing, eventType: 'social', beginnerFriendly: true, registrationRequired: false })
    return { member, contributorA, contributorB, administrator, listing, level, season }
  })
  const asUser = (userId: string) => t.withIdentity({ subject: `${userId}|test-session` })
  return { t, ids, asUser }
}

describe('authorization boundaries', () => {
  it('rejects anonymous protected calls', async () => {
    const { t, ids } = await setup()
    await expect(t.mutation(api.favorites.toggle, { listingId: ids.listing })).rejects.toThrow(/Sign-in required/)
  })

  it('keeps favorites isolated per authenticated user', async () => {
    const { ids, asUser } = await setup()
    const member = asUser(ids.member)
    const other = asUser(ids.contributorB)
    await expect(member.mutation(api.favorites.toggle, { listingId: ids.listing })).resolves.toBe(true)
    await expect(member.query(api.favorites.ids, {})).resolves.toEqual([ids.listing])
    await expect(other.query(api.favorites.ids, {})).resolves.toEqual([])
  })

  it('denies contributor APIs to a regular member', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.member).mutation(api.contributions.createDraft, {
      kind: 'class', title: 'A new class', summary: 'Summary', description: 'Description', sourceUrl: 'https://example.com',
      details: { kind: 'class', seasonId: ids.season, levelId: ids.level, trialAvailable: true, registrationStatus: 'open' },
    })).rejects.toThrow(/permission/)
  })

  it('creates and reads typed class details for the authenticated owner', async () => {
    const { ids, asUser } = await setup()
    const contributor = asUser(ids.contributorA)
    const listingId = await contributor.mutation(api.contributions.createDraft, {
      kind: 'class', title: 'Typed class', summary: 'Summary', description: 'Description', sourceUrl: 'https://example.com/class',
      details: { kind: 'class', seasonId: ids.season, levelId: ids.level, trialAvailable: true, registrationStatus: 'open', priceSummary: 'Free trial' },
    })
    const mine = await contributor.query(api.contributions.listMine, {})
    expect(mine).toContainEqual(expect.objectContaining({
      id: listingId,
      details: expect.objectContaining({ kind: 'class', seasonId: ids.season, levelId: ids.level, registrationStatus: 'open' }),
    }))
  })

  it('prevents one contributor from changing another owner’s listing', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.contributorB).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Hijacked', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'draft',
      details: { kind: 'event', eventType: 'social', beginnerFriendly: true, registrationRequired: false },
    })).rejects.toThrow(/do not own/)
    await expect(asUser(ids.contributorA).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Owner update', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'draft',
      details: { kind: 'event', eventType: 'practice', beginnerFriendly: true, registrationRequired: false },
    })).resolves.toBe(2)
  })

  it('allows only administrators to assign roles and blocks self-demotion', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.contributorA).mutation(api.administration.setRole, { userId: ids.member, role: 'contributor' })).rejects.toThrow(/permission/)
    await expect(asUser(ids.administrator).mutation(api.administration.setRole, { userId: ids.member, role: 'contributor' })).resolves.toBeNull()
    await expect(asUser(ids.administrator).mutation(api.administration.setRole, { userId: ids.administrator, role: 'user' })).rejects.toThrow(/propre rôle/)
  })

  it('gives administrators global listing access without weakening contributor ownership', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.administrator).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Admin correction', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'published',
      details: { kind: 'event', eventType: 'workshop', beginnerFriendly: false, registrationRequired: true },
    })).resolves.toBe(2)
    await expect(asUser(ids.administrator).query(api.administration.listListings, {})).resolves.toEqual([
      expect.objectContaining({ id: ids.listing, title: 'Admin correction', ownerUserId: ids.contributorA }),
    ])
  })

  it('rejects stale writes with an optimistic version conflict', async () => {
    const { ids, asUser } = await setup()
    const owner = asUser(ids.contributorA)
    const args = { listingId: ids.listing, expectedVersion: 1, title: 'Update', summary: 'Summary', description: 'Description', sourceUrl: 'https://example.com', status: 'draft' as const, details: { kind: 'event' as const, eventType: 'social' as const, beginnerFriendly: true, registrationRequired: false } }
    await owner.mutation(api.contributions.updateOwn, args)
    await expect(owner.mutation(api.contributions.updateOwn, args)).rejects.toThrow(/modifiée/)
  })
})
