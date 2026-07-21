import { Injectable } from '@nestjs/common';

export interface AppStatus {
  name: string;
  status: 'ok';
}

@Injectable()
export class AppService {
  getStatus(): AppStatus {
    return { name: 'ZhanaGasyr Education Platform API', status: 'ok' };
  }
}
