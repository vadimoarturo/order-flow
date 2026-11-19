import { CatalogReader } from './domain/interfaces/catalog-reader.interface';
import { Module } from '@nestjs/common';
import { BrowseCatalog } from './application/catalog.port';
import { PrismaCatalogReader } from './infrastructure/prisma-catalog.reader';
import { CatalogController } from './controllers/catalog.controller';
@Module({
    controllers: [CatalogController],
    providers: [
        { provide: CatalogReader, useClass: PrismaCatalogReader },
        { provide: BrowseCatalog, useFactory: (r: CatalogReader) => new BrowseCatalog(r), inject: [CatalogReader] },
    ],
})
export class CatalogModule {}
