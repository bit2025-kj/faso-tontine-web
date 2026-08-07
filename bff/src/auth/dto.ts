import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{6,15}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  referral_code?: string;

  @IsOptional()
  @IsIn(['whatsapp', 'sms', 'email'])
  channel?: string;
}

export class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;
}

export class CompleteProfileDto {
  @IsString()
  prenom!: string;

  @IsString()
  nom!: string;

  @IsString()
  ville!: string;

  @IsIn(['homme', 'femme', 'autre'])
  sexe!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class RegisterDto {
  @IsString()
  @Matches(/^\+?[0-9]{6,15}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @IsString()
  prenom!: string;

  @IsString()
  nom!: string;

  @IsString()
  ville!: string;

  @IsIn(['homme', 'femme', 'autre'])
  sexe!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  password!: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  current_password?: string;

  @IsString()
  @MinLength(8)
  new_password!: string;
}
