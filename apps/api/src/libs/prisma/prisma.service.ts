import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
    constructor() {
        super({
            datasources: {
                db: {
                    url:
                        process.env.DATABASE_URL ||
                        'postgresql://orderflow:orderflow-local-only@localhost:5432/orderflow',
                },
            },
        });
    }
    transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
        return this.$transaction(work, {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 10000,
            timeout: 30000,
        });
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
}
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PersistenceModule {}
