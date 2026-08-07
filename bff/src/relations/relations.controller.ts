import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BackendClientService } from '../common/backend-client.service';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';
import {
  ReviewRelationDto,
  SearchUsersQueryDto,
  SendRelationDto,
  SuggestionsDto,
} from './dto';

@Controller('relations')
@UseGuards(SessionAuthGuard)
export class RelationsController {
  constructor(private readonly backend: BackendClientService) {}

  @Get('users/search')
  async searchUsers(
    @Query() query: SearchUsersQueryDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/relations/users/search',
      sessionId: session.id,
      query,
    });
    return data;
  }

  @Post()
  async send(
    @Body() body: SendRelationDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/relations/',
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Get('received')
  async received(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/relations/received',
      sessionId: session.id,
    });
    return data;
  }

  @Get('sent')
  async sent(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/relations/sent',
      sessionId: session.id,
    });
    return data;
  }

  @Get()
  async list(
    @Query('page') page: string | undefined,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/relations/',
      sessionId: session.id,
      query: { page },
    });
    return data;
  }

  @Post('suggestions')
  async suggestions(
    @Body() body: SuggestionsDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/relations/suggestions',
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Patch(':relationId')
  async review(
    @Param('relationId') relationId: string,
    @Body() body: ReviewRelationDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'PATCH',
      path: `/relations/${relationId}`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Delete(':relationId')
  async remove(
    @Param('relationId') relationId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'DELETE',
      path: `/relations/${relationId}`,
      sessionId: session.id,
    });
    return data;
  }
}
