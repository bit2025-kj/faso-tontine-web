import { Global, Module } from '@nestjs/common';
import { BackendClientService } from './backend-client.service';
import { SessionService } from './session.service';

@Global()
@Module({
  providers: [SessionService, BackendClientService],
  exports: [SessionService, BackendClientService],
})
export class CommonModule {}
