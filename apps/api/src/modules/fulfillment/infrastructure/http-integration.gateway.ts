import { Injectable } from '@nestjs/common';
import { IntegrationGateway, IntegrationFailure } from '../domain/interfaces/fulfillment.ports';
import { IntegrationJob } from '../domain/job';
@Injectable()
export class HttpIntegrationGateway extends IntegrationGateway {
    async execute(job: IntegrationJob, items: { product_id: string; quantity: number }[]) {
        const response = await fetch(
            `${process.env.INTEGRATIONS_URL || 'http://localhost:4100'}/${job.kind === 'reserve' ? 'inventory' : 'delivery'}`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'idempotency-key': `${job.orderId}:${job.kind}`,
                    'x-correlation-id': job.traceId,
                    authorization: `Bearer ${process.env.INTEGRATIONS_TOKEN || ''}`,
                },
                body: JSON.stringify({ orderId: job.orderId, items }),
                signal: AbortSignal.timeout(3000),
            },
        );
        if (!response.ok)
            throw new IntegrationFailure(
                `${response.status}: ${(await response.text()).slice(0, 500)}`,
                response.status >= 400 && response.status < 500 && response.status !== 429,
            );
    }
}
