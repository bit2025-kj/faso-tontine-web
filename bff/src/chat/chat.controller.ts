import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackendClientService } from '../common/backend-client.service';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';
import {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  CreateProposalDto,
  CreateStoryDto,
  PinMessageDto,
  ReactMessageDto,
  SendMessageDto,
  VoteMessageDto,
  VoteProposalDto,
} from './dto';

const MEDIA_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024,
  audio: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

@Controller('chat')
@UseGuards(SessionAuthGuard)
export class ChatController {
  constructor(private readonly backend: BackendClientService) {}

  @Get('conversations')
  async listConversations(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/chat/conversations',
      sessionId: session.id,
    });
    return data;
  }

  @Post('conversations/group')
  async createGroup(
    @Body() body: CreateGroupConversationDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/chat/conversations/group',
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post('conversations/direct')
  async createDirect(
    @Body() body: CreateDirectConversationDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/chat/conversations/direct',
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('media_type') mediaType: string,
    @CurrentSession() session: CurrentSession,
  ) {
    if (!file) throw new BadRequestException('file is required');
    const limit = MEDIA_LIMITS[mediaType];
    if (limit && file.size > limit) {
      throw new BadRequestException(
        `File too large for media_type=${mediaType}`,
      );
    }
    const { data } = await this.backend.multipart({
      method: 'POST',
      path: `/chat/upload?media_type=${encodeURIComponent(mediaType ?? 'document')}`,
      sessionId: session.id,
      files: [
        {
          field: 'file',
          buffer: file.buffer,
          filename: file.originalname,
          mimetype: file.mimetype,
        },
      ],
    });
    return data;
  }

  @Get(':convId/messages')
  async listMessages(
    @Param('convId') convId: string,
    @Query('before') before: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/chat/${convId}/messages`,
      sessionId: session.id,
      query: { before, limit },
    });
    return data;
  }

  @Get(':convId/messages/search')
  async searchMessages(
    @Param('convId') convId: string,
    @Query('q') q: string,
    @Query('limit') limit: string | undefined,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/chat/${convId}/messages/search`,
      sessionId: session.id,
      query: { q, limit },
    });
    return data;
  }

  @Post(':convId/messages')
  async sendMessage(
    @Param('convId') convId: string,
    @Body() body: SendMessageDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/messages`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Delete(':convId/messages/:messageId')
  async deleteMessage(
    @Param('convId') convId: string,
    @Param('messageId') messageId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'DELETE',
      path: `/chat/${convId}/messages/${messageId}`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':convId/messages/:messageId/vote')
  async voteMessage(
    @Param('convId') convId: string,
    @Param('messageId') messageId: string,
    @Body() body: VoteMessageDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/messages/${messageId}/vote`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post(':convId/messages/:messageId/confirm-read')
  async confirmRead(
    @Param('convId') convId: string,
    @Param('messageId') messageId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/messages/${messageId}/confirm-read`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':convId/messages/:messageId/react')
  async react(
    @Param('convId') convId: string,
    @Param('messageId') messageId: string,
    @Body() body: ReactMessageDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/messages/${messageId}/react`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Put(':convId/read')
  async markRead(
    @Param('convId') convId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'PUT',
      path: `/chat/${convId}/read`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':convId/pin')
  async pin(
    @Param('convId') convId: string,
    @Body() body: PinMessageDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/pin`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Delete(':convId/pin')
  async unpin(
    @Param('convId') convId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'DELETE',
      path: `/chat/${convId}/pin`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':convId/stories')
  async createStory(
    @Param('convId') convId: string,
    @Body() body: CreateStoryDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/stories`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Get(':convId/stories')
  async listStories(
    @Param('convId') convId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/chat/${convId}/stories`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':convId/proposals')
  async createProposal(
    @Param('convId') convId: string,
    @Body() body: CreateProposalDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/proposals`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Get(':convId/proposals')
  async listProposals(
    @Param('convId') convId: string,
    @Query('status') status: string | undefined,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/chat/${convId}/proposals`,
      sessionId: session.id,
      query: { status },
    });
    return data;
  }

  @Post(':convId/proposals/:proposalId/vote')
  async voteProposal(
    @Param('convId') convId: string,
    @Param('proposalId') proposalId: string,
    @Body() body: VoteProposalDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/proposals/${proposalId}/vote`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post(':convId/dispute/close')
  async closeDispute(
    @Param('convId') convId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/chat/${convId}/dispute/close`,
      sessionId: session.id,
    });
    return data;
  }
}
