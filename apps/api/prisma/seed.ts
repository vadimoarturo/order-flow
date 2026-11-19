import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const products = [
    {
        id: 'lamp',
        name: 'Arc table lamp',
        category: 'Lighting',
        description: 'A warm pool of light. Oak base and linen shade.',
        price: 8900,
        stock: 40,
        color: 'sand',
        art: 'lamp',
    },
    {
        id: 'chair',
        name: 'Loop lounge chair',
        category: 'Furniture',
        description: 'A comfortable curved lounge chair with soft fabric.',
        price: 24900,
        stock: 18,
        color: 'sage',
        art: 'chair',
    },
    {
        id: 'vase',
        name: 'Form ceramic vase',
        category: 'Objects',
        description: 'Hand-finished ceramic with a quiet sculptural shape.',
        price: 3400,
        stock: 65,
        color: 'clay',
        art: 'vase',
    },
    {
        id: 'shelf',
        name: 'Linea wall shelf',
        category: 'Furniture',
        description: 'Solid ash shelving for everyday essentials.',
        price: 7900,
        stock: 24,
        color: 'cream',
        art: 'shelf',
    },
    {
        id: 'clock',
        name: 'Still wall clock',
        category: 'Objects',
        description: 'A silent-sweep wall clock in warm walnut.',
        price: 4900,
        stock: 38,
        color: 'rose',
        art: 'clock',
    },
    {
        id: 'pendant',
        name: 'Halo pendant',
        category: 'Lighting',
        description: 'Diffused light in a simple woven silhouette.',
        price: 12900,
        stock: 22,
        color: 'fog',
        art: 'pendant',
    },
];
async function seed() {
    for (const p of products) await db.product.upsert({ where: { id: p.id }, create: p, update: {} });
    for (const service of ['inventory', 'delivery'])
        await db.serviceControl.upsert({ where: { service }, create: { service, available: true }, update: {} });
}
seed().finally(() => db.$disconnect());
