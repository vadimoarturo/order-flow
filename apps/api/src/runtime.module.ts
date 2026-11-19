import { DynamicModule, Module } from '@nestjs/common';
import { AppRole } from './common/config/runtime-config';
import { AppModule } from './app.module';
import { HiddenModule } from './hidden.module';
import { IntegrationsModule } from './integrations.module';
@Module({})
export class RuntimeModule {
    static forRole(role: AppRole): DynamicModule {
        return {
            module: RuntimeModule,
            imports: [role === 'worker' ? AppModule : role === 'hidden' ? HiddenModule : IntegrationsModule],
        };
    }
}
