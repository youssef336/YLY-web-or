import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { ExcelGenerator } from '@/application/ports/excel-generator.port';
import type { WhatsAppDeepLinkBuilder } from '@/application/ports/whatsapp-deeplink.port';
import { IdbLocalRepository } from '@/infrastructure/db/local-repository.idb';
import { ExceljsInjector } from '@/infrastructure/excel/exceljs-injector';
import { WaMeDeepLinkBuilder } from '@/infrastructure/whatsapp/wa-deeplink';
import { APP_CONFIG } from '@/infrastructure/config';

import { AddMemberUseCase } from '@/application/use-cases/add-member.use-case';
import { ListMembersUseCase } from '@/application/use-cases/list-members.use-case';
import { GetMemberProfileUseCase } from '@/application/use-cases/get-member-profile.use-case';
import { UpdateMemberNameUseCase } from '@/application/use-cases/update-member-name.use-case';
import { DeleteMemberUseCase } from '@/application/use-cases/delete-member.use-case';
import { UpdateCategoryScoresUseCase } from '@/application/use-cases/update-category-scores.use-case';
import { CreateGlobalFieldVisitUseCase } from '@/application/use-cases/create-global-field-visit.use-case';
import { ListGlobalFieldVisitsUseCase } from '@/application/use-cases/list-global-field-visits.use-case';
import { DeleteGlobalFieldVisitUseCase } from '@/application/use-cases/delete-global-field-visit.use-case';
import { CreateGlobalMeetingUseCase } from '@/application/use-cases/create-global-meeting.use-case';
import { ListGlobalMeetingsUseCase } from '@/application/use-cases/list-global-meetings.use-case';
import { DeleteGlobalMeetingUseCase } from '@/application/use-cases/delete-global-meeting.use-case';
import { AddFieldVisitUseCase } from '@/application/use-cases/add-field-visit.use-case';
import { UpdateFieldVisitUseCase } from '@/application/use-cases/update-field-visit.use-case';
import { RemoveFieldVisitUseCase } from '@/application/use-cases/remove-field-visit.use-case';
import { AddMeetingUseCase } from '@/application/use-cases/add-meeting.use-case';
import { UpdateMeetingUseCase } from '@/application/use-cases/update-meeting.use-case';
import { RemoveMeetingUseCase } from '@/application/use-cases/remove-meeting.use-case';
import { CalculateLeaderboardUseCase } from '@/application/use-cases/calculate-leaderboard.use-case';
import { ExportEvaluationToExcelUseCase } from '@/application/use-cases/export-evaluation-to-excel.use-case';
import { BuildWhatsAppDeepLinkUseCase } from '@/application/use-cases/build-whatsapp-deeplink.use-case';
import { AddHrTaskUseCase } from '@/application/use-cases/add-hr-task.use-case';
import { UpdateHrTaskUseCase } from '@/application/use-cases/update-hr-task.use-case';
import { RemoveHrTaskUseCase } from '@/application/use-cases/remove-hr-task.use-case';

/**
 * Composition root (client-side dependency injection).
 * Wires concrete adapters to ports; the UI only ever talks to use cases.
 */
export interface AppContainer {
  addMember: AddMemberUseCase;
  listMembers: ListMembersUseCase;
  getMemberProfile: GetMemberProfileUseCase;
  updateMemberName: UpdateMemberNameUseCase;
  deleteMember: DeleteMemberUseCase;
  updateCategoryScores: UpdateCategoryScoresUseCase;
  createGlobalFieldVisit: CreateGlobalFieldVisitUseCase;
  listGlobalFieldVisits: ListGlobalFieldVisitsUseCase;
  deleteGlobalFieldVisit: DeleteGlobalFieldVisitUseCase;
  createGlobalMeeting: CreateGlobalMeetingUseCase;
  listGlobalMeetings: ListGlobalMeetingsUseCase;
  deleteGlobalMeeting: DeleteGlobalMeetingUseCase;
  addFieldVisit: AddFieldVisitUseCase;
  updateFieldVisit: UpdateFieldVisitUseCase;
  removeFieldVisit: RemoveFieldVisitUseCase;
  addMeeting: AddMeetingUseCase;
  updateMeeting: UpdateMeetingUseCase;
  removeMeeting: RemoveMeetingUseCase;
  calculateLeaderboard: CalculateLeaderboardUseCase;
  exportEvaluationToExcel: ExportEvaluationToExcelUseCase;
  buildWhatsAppDeepLink: BuildWhatsAppDeepLinkUseCase;
  addHrTask: AddHrTaskUseCase;
  updateHrTask: UpdateHrTaskUseCase;
  removeHrTask: RemoveHrTaskUseCase;
}

export function createContainer(): AppContainer {
  const repository: LocalMemberRepository = new IdbLocalRepository();
  const excel: ExcelGenerator = new ExceljsInjector();
  const whatsapp: WhatsAppDeepLinkBuilder = new WaMeDeepLinkBuilder();

  return {
    addMember: new AddMemberUseCase(repository),
    listMembers: new ListMembersUseCase(repository),
    getMemberProfile: new GetMemberProfileUseCase(repository),
    updateMemberName: new UpdateMemberNameUseCase(repository),
    deleteMember: new DeleteMemberUseCase(repository),
    updateCategoryScores: new UpdateCategoryScoresUseCase(repository),
    createGlobalFieldVisit: new CreateGlobalFieldVisitUseCase(repository),
    listGlobalFieldVisits: new ListGlobalFieldVisitsUseCase(repository),
    deleteGlobalFieldVisit: new DeleteGlobalFieldVisitUseCase(repository),
    createGlobalMeeting: new CreateGlobalMeetingUseCase(repository),
    listGlobalMeetings: new ListGlobalMeetingsUseCase(repository),
    deleteGlobalMeeting: new DeleteGlobalMeetingUseCase(repository),
    addFieldVisit: new AddFieldVisitUseCase(repository),
    updateFieldVisit: new UpdateFieldVisitUseCase(repository),
    removeFieldVisit: new RemoveFieldVisitUseCase(repository),
    addMeeting: new AddMeetingUseCase(repository),
    updateMeeting: new UpdateMeetingUseCase(repository),
    removeMeeting: new RemoveMeetingUseCase(repository),
    calculateLeaderboard: new CalculateLeaderboardUseCase(repository),
    exportEvaluationToExcel: new ExportEvaluationToExcelUseCase(repository, excel),
    buildWhatsAppDeepLink: new BuildWhatsAppDeepLinkUseCase(repository, whatsapp, APP_CONFIG.WHATSAPP_TO),
    addHrTask: new AddHrTaskUseCase(repository),
    updateHrTask: new UpdateHrTaskUseCase(repository),
    removeHrTask: new RemoveHrTaskUseCase(repository),
  };
}

let container: AppContainer | null = null;

/** Returns the shared container (created once per browser session). */
export function getContainer(): AppContainer {
  if (!container) container = createContainer();
  return container;
}
