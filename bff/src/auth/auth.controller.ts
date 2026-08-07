import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { BackendClientService } from '../common/backend-client.service';
import { SESSION_COOKIE } from '../common/constants';
import { CurrentSession } from '../common/current-session.decorator';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { SessionService } from '../common/session.service';
import {
  ChangePasswordDto,
  CompleteProfileDto,
  LoginDto,
  RegisterDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

// Limite resserrée sur les endpoints sensibles (OTP, mot de passe) : 10/min
// par IP navigateur, aligné sur la limite du backend. Empêche le brute-force
// et évite qu'un utilisateur qui rate son mot de passe n'épuise le quota.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

interface VerifyOtpBackendResponse {
  user_id: string;
  role: string;
  access_token: string;
  refresh_token: string;
  profile_complete: boolean;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Not HMAC-signed: the value is an opaque crypto.randomUUID() the
    // session store issued, not data whose integrity needs verifying — an
    // attacker can't forge one they don't already know regardless of
    // signing. That lets the raw WebSocket upgrade path (which never runs
    // through Express's cookie-parser middleware) parse this cookie the
    // same trivial way as the HTTP side. httpOnly + Secure + SameSite are
    // what actually protect it.
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly backend: BackendClientService,
    private readonly sessions: SessionService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('request-otp')
  async requestOtp(@Body() body: RequestOtpDto) {
    // Web client scope is participant-only — the role sent to the backend
    // is never taken from the browser.
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/auth/request-otp',
      body: {
        phone: body.phone,
        role: 'participant',
        referral_code: body.referral_code,
        channel: body.channel,
      },
    });
    return data;
  }

  @Get('otp-channels')
  async otpChannels(@Query('phone') phone: string) {
    if (!phone) throw new BadRequestException('phone is required');
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/auth/otp-channels',
      query: { phone },
    });
    return data;
  }

  @Throttle(AUTH_THROTTLE)
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceId = req.deviceId!;
    const { data } = await this.backend.json<VerifyOtpBackendResponse>({
      method: 'POST',
      path: '/auth/verify-otp',
      body: { phone: body.phone, code: body.code, device_id: deviceId },
    });

    const sessionId = this.sessions.create({
      userId: data.user_id,
      role: data.role,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      deviceId,
      profileComplete: Boolean(data.profile_complete),
    });
    res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions());

    // Tokens never leave the BFF — only the shape the frontend needs to route itself.
    return {
      role: data.role,
      profile_complete: Boolean(data.profile_complete),
    };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceId = req.deviceId!;
    // Web client scope is participant-only — the role sent to the backend
    // is never taken from the browser (same pattern as request-otp).
    const { data } = await this.backend.json<VerifyOtpBackendResponse>({
      method: 'POST',
      path: '/auth/register',
      body: {
        phone: body.phone,
        role: 'participant',
        prenom: body.prenom,
        nom: body.nom,
        ville: body.ville,
        sexe: body.sexe,
        email: body.email,
        password: body.password,
        device_id: deviceId,
      },
    });

    const sessionId = this.sessions.create({
      userId: data.user_id,
      role: data.role,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      deviceId,
      profileComplete: Boolean(data.profile_complete),
    });
    res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions());

    return {
      role: data.role,
      profile_complete: Boolean(data.profile_complete),
    };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceId = req.deviceId!;
    const { data } = await this.backend.json<VerifyOtpBackendResponse>({
      method: 'POST',
      path: '/auth/login',
      body: { phone: body.phone, password: body.password, device_id: deviceId },
    });

    const sessionId = this.sessions.create({
      userId: data.user_id,
      role: data.role,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      deviceId,
      profileComplete: Boolean(data.profile_complete),
    });
    res.cookie(SESSION_COOKIE, sessionId, sessionCookieOptions());

    return {
      role: data.role,
      profile_complete: Boolean(data.profile_complete),
    };
  }

  @UseGuards(SessionAuthGuard)
  @Post('complete-profile')
  async completeProfile(
    @Body() body: CompleteProfileDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json({
      method: 'POST',
      path: '/auth/complete-profile',
      sessionId: session.id,
      body,
    });
    this.sessions.update(session.id, { profileComplete: true });
    return data;
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(SessionAuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentSession() session: CurrentSession,
  ) {
    const { data } = await this.backend.json<VerifyOtpBackendResponse>({
      method: 'POST',
      path: '/auth/change-password',
      sessionId: session.id,
      body: {
        current_password: body.current_password,
        new_password: body.new_password,
      },
    });
    // Le backend révoque les anciens jetons en changeant le mot de passe —
    // il en renvoie de nouveaux immédiatement, à répercuter sur la session BFF.
    this.sessions.update(session.id, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
    return { role: data.role, profile_complete: Boolean(data.profile_complete) };
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  async me(@CurrentSession() session: CurrentSession) {
    const { data } = await this.backend.json({
      method: 'GET',
      path: '/auth/me',
      sessionId: session.id,
    });
    return data;
  }

  @UseGuards(SessionAuthGuard)
  @Put('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_BYTES } }),
  )
  async avatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentSession() session: CurrentSession,
  ) {
    if (!file) throw new BadRequestException('file is required');
    const { data } = await this.backend.multipart({
      method: 'PUT',
      path: '/auth/avatar',
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

  @UseGuards(SessionAuthGuard)
  @Put('fcm-token')
  async fcmToken(
    @Body() body: { fcm_token?: string },
    @CurrentSession() session: CurrentSession,
  ) {
    if (!body.fcm_token) throw new BadRequestException('fcm_token is required');
    const { data } = await this.backend.json({
      method: 'PUT',
      path: '/auth/fcm-token',
      sessionId: session.id,
      body: { fcm_token: body.fcm_token },
    });
    return data;
  }

  @UseGuards(SessionAuthGuard)
  @Post('logout')
  logout(
    @CurrentSession() session: CurrentSession,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.sessions.destroy(session.id);
    res.clearCookie(SESSION_COOKIE);
    return { ok: true };
  }
}
