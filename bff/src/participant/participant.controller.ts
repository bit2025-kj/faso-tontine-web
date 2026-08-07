import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BackendClientService } from '../common/backend-client.service';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';

@Controller('participant')
@UseGuards(SessionAuthGuard)
export class ParticipantController {
  constructor(private readonly backend: BackendClientService) {}

  @Get('tontines')
  async myTontines(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/participant/tontines',
      sessionId: session.id,
    });
    return data;
  }

  @Get('tontines/:ownerId/:localId')
  async detail(
    @Param('ownerId') ownerId: string,
    @Param('localId') localId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/participant/tontines/${ownerId}/${localId}`,
      sessionId: session.id,
    });
    return data;
  }

  @Get('tontines/:ownerId/:localId/contributions')
  async contributions(
    @Param('ownerId') ownerId: string,
    @Param('localId') localId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/participant/tontines/${ownerId}/${localId}/contributions`,
      sessionId: session.id,
    });
    return data;
  }

  @Get('tontines/:ownerId/:localId/penalty')
  async penalty(
    @Param('ownerId') ownerId: string,
    @Param('localId') localId: string,
    @Query('member_local_id') memberLocalId: string,
    @Query('due_date') dueDate: string,
    @Query('amount') amount: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/participant/tontines/${ownerId}/${localId}/penalty`,
      sessionId: session.id,
      query: { member_local_id: memberLocalId, due_date: dueDate, amount },
    });
    return data;
  }
}
