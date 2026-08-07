import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class ListFeedQueryDto {
  @IsOptional()
  @IsIn(['seeking_members', 'seeking_tontine'])
  type?: string;

  @IsOptional()
  @IsIn(['rotative', 'epargne'])
  tontine_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page_size?: number;
}

export class CreateFeedPostDto {
  @IsIn(['seeking_members', 'seeking_tontine'])
  type!: string;

  @IsString()
  @Length(5, 120)
  title!: string;

  @IsString()
  @Length(10, 1000)
  description!: string;

  @IsOptional()
  @IsIn(['rotative', 'epargne'])
  tontine_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  amount?: number;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(500)
  slots_total?: number;

  @IsOptional()
  @IsString()
  tontine_id?: string;

  @IsOptional()
  @IsString()
  tontine_local_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  media_urls?: string[];

  @IsOptional()
  @IsString()
  media_type?: string;
}

export class UpdateFeedPostDto {
  @IsOptional()
  @IsString()
  @Length(5, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 1000)
  description?: string;

  @IsOptional()
  @IsIn(['rotative', 'epargne'])
  tontine_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  amount?: number;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(500)
  slots_total?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  media_urls?: string[];

  @IsOptional()
  @IsString()
  media_type?: string;
}

export class CreateJoinRequestDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}

export class ReportPostDto {
  @IsIn(['spam', 'inappropriate', 'fake', 'other'])
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  details?: string;
}

export class CreateCommentDto {
  @IsString()
  @Length(1, 500)
  text!: string;

  @IsOptional()
  @IsString()
  parent_comment_id?: string;
}

export class ListRequestsQueryDto {
  @IsOptional()
  @IsIn(['pending', 'accepted', 'rejected'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number;
}

export class ReviewJoinRequestDto {
  @IsBoolean()
  accepted!: boolean;
}

export class ListCommentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  page_size?: number;
}
