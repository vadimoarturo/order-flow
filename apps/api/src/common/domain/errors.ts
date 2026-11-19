export class BusinessError extends Error {
    constructor(
        public readonly code: 'invalid' | 'conflict' | 'not_found',
        message: string,
    ) {
        super(message);
        this.name = 'BusinessError';
    }
}
