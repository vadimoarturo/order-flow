import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { CatalogReader } from '../domain/interfaces/catalog-reader.interface';
@Injectable()
export class PrismaCatalogReader extends CatalogReader {
    constructor(private readonly db: PrismaService) {
        super();
    }
    list() {
        return this.db.product.findMany({ orderBy: { id: 'asc' } });
    }
}
