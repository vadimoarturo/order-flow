import { Controller, Get } from '@nestjs/common';
import { BrowseCatalog } from '../application/catalog.port';
@Controller('products')
export class CatalogController {
    constructor(private readonly browse: BrowseCatalog) {}
    @Get() list() {
        return this.browse.execute();
    }
}
