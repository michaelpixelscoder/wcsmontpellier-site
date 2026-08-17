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
    const actor = await ctx.db.insert('actors', { slug: 'test-actor', name: 'Test Actor', summary: 'Test', status: 'published', updatedAt: 1 })
    const place = await ctx.db.insert('places', { slug: 'test-place', name: 'Test Place', addressLine1: '1 Test', postalCode: '34000', city: 'Montpellier', countryCode: 'FR', latitude: 43.6, longitude: 3.88, status: 'published', updatedAt: 1 })
    const listing = await ctx.db.insert('listings', {
      slug: 'owned-listing', kind: 'event', title: 'Owned listing', summary: 'Summary', description: 'Description',
      ownerUserId: contributorA, sourceUrl: 'https://example.com/source', status: 'published',
      verificationStatus: 'contributor_verified', updatedAt: 1, version: 1,
    })
    await ctx.db.insert('events', { listingId: listing, eventType: 'social', beginnerFriendly: true, registrationRequired: false })
    return { member, contributorA, contributorB, administrator, listing, level, season, actor, place }
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
      details: { kind: 'class', seasonId: ids.season, levelId: ids.level, trialAvailable: true, registrationStatus: 'open', teacherIds: [] },
    })).rejects.toThrow(/permission/)
  })

  it('creates and reads typed class details for the authenticated owner', async () => {
    const { ids, asUser } = await setup()
    const contributor = asUser(ids.contributorA)
    const listingId = await contributor.mutation(api.contributions.createDraft, {
      kind: 'class', title: 'Typed class', summary: 'Summary', description: 'Description', sourceUrl: 'https://example.com/class',
      details: { kind: 'class', seasonId: ids.season, levelId: ids.level, trialAvailable: true, registrationStatus: 'open', priceSummary: 'Free trial', teacherIds: [ids.actor], schedule: { placeId: ids.place, weekdays: ['monday'], localStartTime: '19:00', localEndTime: '20:00', startsOn: '2026-01-01', endsOn: '2026-12-31' } },
    })
    const mine = await contributor.query(api.contributions.listMine, {})
    expect(mine).toContainEqual(expect.objectContaining({
      id: listingId,
      details: expect.objectContaining({ kind: 'class', seasonId: ids.season, levelId: ids.level, registrationStatus: 'open' }),
    }))
  })

  it('blocks publication until scheduling and attribution are complete', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.contributorA).mutation(api.contributions.updateOwn, {
      listingId: ids.listing,
      expectedVersion: 1,
      title: 'Incomplete event',
      summary: 'Summary',
      description: 'Description',
      sourceUrl: 'https://example.com',
      status: 'published',
      details: { kind: 'event', eventType: 'social', beginnerFriendly: true, registrationRequired: false, organizerIds: [] },
    })).rejects.toThrow(/lieu, un horaire/)
  })

  it('keeps contributor-created places and intervenants owner-scoped', async () => {
    const { ids, asUser } = await setup()
    const owner = asUser(ids.contributorA)
    const outsider = asUser(ids.contributorB)
    const placeId = await owner.mutation(api.references.createPlace, { name: 'Owned place', addressLine1: '1 Test', postalCode: '34000', city: 'Montpellier', countryCode: 'FR', latitude: 43.6, longitude: 3.88 })
    await expect(outsider.mutation(api.references.updatePlace, { placeId, name: 'Hijacked', addressLine1: '1 Test', postalCode: '34000', city: 'Montpellier', countryCode: 'FR', latitude: 43.6, longitude: 3.88 })).rejects.toThrow(/gérez pas/)
    const actorId = await owner.mutation(api.references.createActor, { name: 'Owned actor', summary: 'A complete summary.' })
    await expect(outsider.mutation(api.references.updateActor, { actorId, name: 'Hijacked', summary: 'A complete summary.' })).rejects.toThrow(/gérez pas/)
    const mine = await owner.query(api.references.listMine, {})
    expect(mine.places).toContainEqual(expect.objectContaining({ id: placeId, name: 'Owned place' }))
    expect(mine.actors).toContainEqual(expect.objectContaining({ id: actorId, name: 'Owned actor' }))
  })

  it('prevents one contributor from changing another owner’s listing', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.contributorB).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Hijacked', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'draft',
      details: { kind: 'event', eventType: 'social', beginnerFriendly: true, registrationRequired: false, organizerIds: [] },
    })).rejects.toThrow(/do not own/)
    await expect(asUser(ids.contributorA).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Owner update', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'draft',
      details: { kind: 'event', eventType: 'practice', beginnerFriendly: true, registrationRequired: false, organizerIds: [] },
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
      details: { kind: 'event', eventType: 'workshop', beginnerFriendly: false, registrationRequired: true, organizerIds: [ids.actor], occurrence: { placeId: ids.place, startsAt: 2_000, endsAt: 3_000, status: 'scheduled' } },
    })).resolves.toBe(2)
    await expect(asUser(ids.administrator).query(api.administration.listListings, {})).resolves.toEqual([
      expect.objectContaining({ id: ids.listing, title: 'Admin correction', ownerUserId: ids.contributorA }),
    ])
  })

  it('rejects stale writes with an optimistic version conflict', async () => {
    const { ids, asUser } = await setup()
    const owner = asUser(ids.contributorA)
    const args = { listingId: ids.listing, expectedVersion: 1, title: 'Update', summary: 'Summary', description: 'Description', sourceUrl: 'https://example.com', status: 'draft' as const, details: { kind: 'event' as const, eventType: 'social' as const, beginnerFriendly: true, registrationRequired: false, organizerIds: [] } }
    await owner.mutation(api.contributions.updateOwn, args)
    await expect(owner.mutation(api.contributions.updateOwn, args)).rejects.toThrow(/modifiée/)
  })
})
