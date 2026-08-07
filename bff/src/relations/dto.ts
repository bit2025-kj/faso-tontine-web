import { ArrayMaxSize, IsArray, IsIn, IsString, Length } from 'class-validator';

export class SendRelationDto {
  @IsString()
  to_user_id!: string;

  @IsIn(['friend', 'association'])
  type!: string;
}

export class ReviewRelationDto {
  @IsIn(['accept', 'reject'])
  action!: string;
}

export class SuggestionsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  phones!: string[];
}

export class SearchUsersQueryDto {
  @IsString()
  @Length(2, 50)
  q!: string;
}
