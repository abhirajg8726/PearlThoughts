// emailService.test.js
const { EmailService, MockEmailProvider } = require('./emailService');

describe('EmailService', () => {
    let emailService;
    let mockProvider1;
    let mockProvider2;

    beforeEach(() => {
        mockProvider1 = new MockEmailProvider(0.5); // 50% failure rate
        mockProvider2 = new MockEmailProvider(0.1); // 10% failure rate
        emailService = new EmailService([mockProvider1, mockProvider2]);
    });

    test('should send email successfully', async () => {
        emailService.sendEmail('test@example.com');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
        const status = emailService.getStatus('test@example.com');
        expect(status.status).toBe('sent');
    });

    test('should retry on failure', async () => {
        mockProvider1 = new MockEmailProvider(1.0); // Always fail
        emailService = new EmailService([mockProvider1, mockProvider2]);
        emailService.sendEmail('test@example.com');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for retries
        const status = emailService.getStatus('test@example.com');
        expect(status.status).toBe('sent');
    });
});
