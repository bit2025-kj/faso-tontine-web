import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { IsIn, IsString } from 'class-validator';
import { BackendClientService } from '../common/backend-client.service';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';

const DOC_MAX_BYTES = 8 * 1024 * 1024;

class SubmitKycDto {
  @IsString()
  full_name!: string;

  @IsIn(['national_id', 'passport', 'driver_license'])
  id_type!: string;

  @IsString()
  id_number!: string;
}

@Controller('kyc')
@UseGuards(SessionAuthGuard)
export class KycController {
  constructor(private readonly backend: BackendClientService) {}

  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'id_document', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      { limits: { fileSize: DOC_MAX_BYTES } },
    ),
  )
  async submit(
    @Body() body: SubmitKycDto,
    @UploadedFiles()
    files: {
      id_document?: Express.Multer.File[];
      selfie?: Express.Multer.File[];
    },
    @CurrentSession() session: CurrentSession,
  ) {
    const idDocument = files?.id_document?.[0];
    const selfie = files?.selfie?.[0];
    if (!idDocument || !selfie) {
      throw new BadRequestException('id_document and selfie are both required');
    }
    const { data } = await this.backend.multipart({
      method: 'POST',
      path: '/kyc/submit',
      sessionId: session.id,
      fields: {
        full_name: body.full_name,
        id_type: body.id_type,
        id_number: body.id_number,
      },
      files: [
        {
          field: 'id_document',
          buffer: idDocument.buffer,
          filename: idDocument.originalname,
          mimetype: idDocument.mimetype,
        },
        {
          field: 'selfie',
          buffer: selfie.buffer,
          filename: selfie.originalname,
          mimetype: selfie.mimetype,
        },
      ],
    });
    return data;
  }

  @Get('my-status')
  async myStatus(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/kyc/my-status',
      sessionId: session.id,
    });
    return data;
  }
}
