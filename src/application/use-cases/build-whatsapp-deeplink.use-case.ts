import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { WhatsAppDeepLinkBuilder } from '@/application/ports/whatsapp-deeplink.port';
import type { MemberProfile } from '@/domain/entities/member-profile';
import { MemberNotFoundError } from './errors';

/**
 * Builds a wa.me deep link with the member's evaluation summary pre-filled as
 * the message text. The offline-first app has no server, so the evaluator
 * taps the link and WhatsApp opens with the report ready to send to the Team
 * Leader's number.
 */
export class BuildWhatsAppDeepLinkUseCase {
  constructor(
    private readonly repository: LocalMemberRepository,
    private readonly builder: WhatsAppDeepLinkBuilder,
    private readonly defaultRecipient: string,
  ) {}

  async execute(memberId: string): Promise<string> {
    const profile = await this.repository.loadProfile(memberId);
    if (!profile) throw new MemberNotFoundError(memberId);
    return this.builder.build(this.defaultRecipient, buildSummaryText(profile));
  }
}

export function buildSummaryText(profile: MemberProfile): string {
  const { summary } = profile;
  return [
    `*Member Evaluation Report*`,
    `Name: ${profile.member.name}`,
    ``,
    `Tasks: ${summary.tasks}/20`,
    `Field Visits: ${summary.fieldVisits}/30`,
    `Meetings: ${summary.meetings}/30`,
    `Interaction: ${summary.interaction}/10`,
    `Respect Hierarchy: ${summary.respectHierarchy}/10`,
    `Bonus: ${summary.bonus}/10`,
    ``,
    `Total: ${summary.total}/110 (${summary.percentage}%)`,
    `Grade: ${summary.grade}`,
  ].join('\n');
}