import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
export type StaffRole = 'operator' | 'oncall';
export interface StaffIdentity {
    role: StaffRole;
    actor: string;
}
@Injectable()
export class StaffAuthService {
    private readonly tokens: Record<StaffRole, string>;
    constructor() {
        const operator = process.env.OPERATOR_TOKEN,
            oncall = process.env.ONCALL_TOKEN;
        if (!operator || !oncall || operator === oncall)
            throw new Error('Distinct OPERATOR_TOKEN and ONCALL_TOKEN are required');
        this.tokens = { operator, oncall };
    }
    authenticate(authorization: string | undefined): StaffIdentity | undefined {
        const value = authorization?.replace(/^Bearer /, '');
        if (!value) return;
        for (const role of ['operator', 'oncall'] as const) {
            const expected = Buffer.from(this.tokens[role]),
                actual = Buffer.from(value);
            if (expected.length === actual.length && timingSafeEqual(expected, actual))
                return { role, actor: `demo-${role}` };
        }
    }
}
