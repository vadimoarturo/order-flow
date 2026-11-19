export interface CatalogProduct {
    id: string;
    name: string;
    category: string;
    description: string;
    price: number;
    stock: number;
    color: string;
    art: string;
}
export abstract class CatalogReader {
    abstract list(): Promise<CatalogProduct[]>;
}
