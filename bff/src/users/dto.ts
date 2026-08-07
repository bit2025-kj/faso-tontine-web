import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class RateUserDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  comment?: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class ReportUserDto {
  @IsIn(['non_payment', 'fraud', 'abuse', 'impersonation', 'other'])
  reason!: string;

  @IsOptional()
  @IsString()
  detail?: string;
}
