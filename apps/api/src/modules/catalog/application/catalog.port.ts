import { CatalogReader } from '../domain/interfaces/catalog-reader.interface';
export class BrowseCatalog {
    constructor(private readonly reader: CatalogReader) {}
    execute() {
        return this.reader.list();
    }
}
