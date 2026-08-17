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
    const listing = await ctx.db.insert('listings', {
      slug: 'owned-listing', kind: 'event', title: 'Owned listing', summary: 'Summary', description: 'Description',
      ownerUserId: contributorA, sourceUrl: 'https://example.com/source', status: 'published',
      verificationStatus: 'contributor_verified', updatedAt: 1, version: 1,
    })
    return { member, contributorA, contributorB, administrator, listing }
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
    })).rejects.toThrow(/permission/)
  })

  it('prevents one contributor from changing another owner’s listing', async () => {
    const { ids, asUser } = await setup()
    await expect(asUser(ids.contributorB).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Hijacked', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'draft',
    })).rejects.toThrow(/do not own/)
    await expect(asUser(ids.contributorA).mutation(api.contributions.updateOwn, {
      listingId: ids.listing, expectedVersion: 1, title: 'Owner update', summary: 'Summary', description: 'Description',
      sourceUrl: 'https://example.com', status: 'draft',
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
    })).resolves.toBe(2)
    await expect(asUser(ids.administrator).query(api.administration.listListings, {})).resolves.toEqual([
      expect.objectContaining({ id: ids.listing, title: 'Admin correction', ownerUserId: ids.contributorA }),
    ])
  })

  it('rejects stale writes with an optimistic version conflict', async () => {
    const { ids, asUser } = await setup()
    const owner = asUser(ids.contributorA)
    const args = { listingId: ids.listing, expectedVersion: 1, title: 'Update', summary: 'Summary', description: 'Description', sourceUrl: 'https://example.com', status: 'draft' as const }
    await owner.mutation(api.contributions.updateOwn, args)
    await expect(owner.mutation(api.contributions.updateOwn, args)).rejects.toThrow(/modifiée/)
  })
})
