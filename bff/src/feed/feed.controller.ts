import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  CreateCommentDto,
  CreateFeedPostDto,
  CreateJoinRequestDto,
  ListCommentsQueryDto,
  ListFeedQueryDto,
  ListRequestsQueryDto,
  ReportPostDto,
  ReviewJoinRequestDto,
  UpdateFeedPostDto,
} from './dto';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

@Controller('feed')
@UseGuards(SessionAuthGuard)
export class FeedController {
  constructor(private readonly backend: BackendClientService) {}

  @Get()
  async list(
    @Query() query: ListFeedQueryDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/feed',
      sessionId: session.id,
      query,
    });
    return data;
  }

  @Post()
  async create(
    @Body() body: CreateFeedPostDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/feed',
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post('upload-media')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: VIDEO_MAX_BYTES } }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @CurrentSession() session: CurrentSession,
  ) {
    if (!file) throw new BadRequestException('file is required');
    const isVideo = file.mimetype.startsWith('video/');
    if (!isVideo && file.size > IMAGE_MAX_BYTES) {
      throw new BadRequestException('Image too large (max 10MB)');
    }
    const { data } = await this.backend.multipart({
      method: 'POST',
      path: '/feed/upload-media',
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

  @Get('my-requests')
  async myRequests(
    @Query('status') status: string | undefined,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/feed/my-requests',
      sessionId: session.id,
      query: { status },
    });
    return data;
  }

  // Demandes d'adhésion reçues sur une annonce dont l'utilisateur est l'auteur.
  // Ces routes existent côté FastAPI mais n'étaient pas proxyées ici → l'écran
  // "Voir les demandes" du web tombait sur un 404 (voir audit du 2026-08-05).
  @Get(':postId/requests')
  async listRequests(
    @Param('postId') postId: string,
    @Query() query: ListRequestsQueryDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/feed/${postId}/requests`,
      sessionId: session.id,
      query,
    });
    return data;
  }

  @Patch(':postId/requests/:requestId')
  async reviewRequest(
    @Param('postId') postId: string,
    @Param('requestId') requestId: string,
    @Body() body: ReviewJoinRequestDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'PATCH',
      path: `/feed/${postId}/requests/${requestId}`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Get(':postId')
  async get(
    @Param('postId') postId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/feed/${postId}`,
      sessionId: session.id,
    });
    return data;
  }

  @Patch(':postId')
  async update(
    @Param('postId') postId: string,
    @Body() body: UpdateFeedPostDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'PATCH',
      path: `/feed/${postId}`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Delete(':postId')
  async remove(
    @Param('postId') postId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'DELETE',
      path: `/feed/${postId}`,
      sessionId: session.id,
    });
    return data;
  }

  @Post(':postId/report')
  async report(
    @Param('postId') postId: string,
    @Body() body: ReportPostDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/feed/${postId}/report`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post(':postId/request')
  async requestToJoin(
    @Param('postId') postId: string,
    @Body() body: CreateJoinRequestDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/feed/${postId}/request`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Post(':postId/like')
  async toggleLike(
    @Param('postId') postId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/feed/${postId}/like`,
      sessionId: session.id,
    });
    return data;
  }

  @Get(':postId/comments')
  async listComments(
    @Param('postId') postId: string,
    @Query() query: ListCommentsQueryDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: `/feed/${postId}/comments`,
      sessionId: session.id,
      query,
    });
    return data;
  }

  @Post(':postId/comments')
  async addComment(
    @Param('postId') postId: string,
    @Body() body: CreateCommentDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: `/feed/${postId}/comments`,
      sessionId: session.id,
      body,
    });
    return data;
  }

  @Delete(':postId/comments/:commentId')
  async removeComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'DELETE',
      path: `/feed/${postId}/comments/${commentId}`,
      sessionId: session.id,
    });
    return data;
  }
}
