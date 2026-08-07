import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BackendClientService } from '../common/backend-client.service';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RateUserDto, ReportUserDto } from './dto';

@Controller('users')
@UseGuards(SessionAuthGuard)
export class UsersController {
  constructor(private readonly backend: BackendClientService) {}

  // Must come before ':userId/*' routes — otherwise "me" is parsed as a userId.
  @Get('me/referral')
  async myReferral(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/users/me/referral',
      sessionId: session.id,
    });
    return data;
  }

  @Get(':userId/profile')
  async profile(
    @Param('userId') userId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/users/${userId}/profile`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':userId/rate')
  async rate(
    @Param('userId') userId: string,
    @Body() body: RateUserDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/users/${userId}/rate`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post(':userId/report')
  async report(
    @Param('userId') userId: string,
    @Body() body: ReportUserDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/users/${userId}/report`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post(':userId/reactivate')
  async reactivate(
    @Param('userId') userId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/users/${userId}/reactivate`,
      sessionId: session.id,
    });
    return data;
  }
}
