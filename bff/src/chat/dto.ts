import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

// Aligné sur Poll/PollOption (backend/app/schemas/chat.py). Sans ces classes,
// le ValidationPipe global (whitelist: true) supprimait silencieusement tout
// champ `poll` inconnu de SendMessageDto avant de transmettre au backend, qui
// rejetait ensuite l'envoi avec un 422 masqué en "vérifiez votre connexion"
// côté web (voir audit chat).
export class PollOptionDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voter_ids?: string[];
}

export class PollDto {
  @IsString()
  question!: string;

  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options!: PollOptionDto[];

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}

export class CreateGroupConversationDto {
  @IsOptional()
  @IsString()
  tontine_id?: string;

  @IsOptional()
  @IsString()
  tontine_local_id?: string;

  @IsString()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  member_ids!: string[];
}

export class CreateDirectConversationDto {
  @IsString()
  other_user_id!: string;
}

export class SendMessageDto {
  @IsIn(['text', 'image', 'audio', 'video', 'document', 'poll'])
  type!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  media_url?: string;

  @IsOptional()
  @IsInt()
  duration_ms?: number;

  @IsOptional()
  @IsArray()
  mentions?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PollDto)
  poll?: PollDto;
}

export class VoteMessageDto {
  @IsInt()
  @Min(0)
  option_index!: number;
}

export class ReactMessageDto {
  @IsIn(['👍', '❤️', '😂', '😮', '😢', '🎉'])
  emoji!: string;
}

export class PinMessageDto {
  @IsString()
  message_id!: string;
}

export class CreateStoryDto {
  @IsOptional()
  @IsString()
  media_url?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  text?: string;
}

export class CreateProposalDto {
  @IsIn(['guaranty', 'reserve_fund', 'rule_change'])
  type!: string;

  @IsOptional()
  payload?: unknown;
}

export class VoteProposalDto {
  @IsBoolean()
  yes!: boolean;
}
