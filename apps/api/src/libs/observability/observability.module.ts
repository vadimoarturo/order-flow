import { Global, Injectable, Module } from '@nestjs/common';
import { SystemSignals } from '../../common/domain/system-signals';
import { PrismaService, PersistenceModule } from '../prisma/prisma.service';
import { metrics, registry } from './observability';
@Injectable()
class PrismaSystemSignals extends SystemSignals {
    constructor(private readonly db: PrismaService) {
        super();
    }
    async databaseReady() {
        await this.db.$queryRaw`SELECT 1`;
    }
    async scrape() {
        return { contentType: registry.contentType, body: await metrics(this.db) };
    }
}
@Global()
@Module({
    imports: [PersistenceModule],
    providers: [{ provide: SystemSignals, useClass: PrismaSystemSignals }],
    exports: [SystemSignals],
})
export class ObservabilityModule {}
