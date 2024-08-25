// emailService.js
const EventEmitter = require('events');

/**
 * Mock Email Provider Class
 */
class MockEmailProvider {
    constructor(failureRate) {
        this.failureRate = failureRate;
    }

    async sendEmail(email) {
        if (Math.random() < this.failureRate) {
            throw new Error('Simulated provider failure');
        }
    }
}

/**
 * Email Service Class
 */
class EmailService {
    constructor(providers) {
        this.providers = providers;
        this.currentProviderIndex = 0;
        this.emailQueue = [];
        this.status = new Map();
        this.emailEmitter = new EventEmitter();
        this.emailSendCount = 0;
        this.emailRateLimit = 5; // Max emails per second
        this.providerFailures = new Array(providers.length).fill(0);
        this.processingQueue = false;

        this.processQueueInterval = setInterval(() => this.processQueue(), 1000); // Process queue every second
    }

    async sendEmailWithRetry(email, retries) {
        const provider = this.providers[this.currentProviderIndex];
        const backoffTime = Math.pow(2, retries) * 1000; // Exponential backoff

        try {
            await provider.sendEmail(email);
            this.status.set(email, { email, status: 'sent', retries, timestamp: Date.now() });
            console.log(`Email sent successfully: ${email}`);
        } catch (error) {
            if (retries < 5) {
                await this.sleep(backoffTime);
                await this.sendEmailWithRetry(email, retries + 1);
            } else {
                this.status.set(email, { email, status: 'failed', retries, timestamp: Date.now() });
                console.log(`Failed to send email after retries: ${email}`);
                this.switchProvider();
                this.emailQueue.push(email); // Re-add to queue to retry
            }
        }
    }

    switchProvider() {
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
        this.providerFailures[this.currentProviderIndex]++;
        
        if (this.providerFailures[this.currentProviderIndex] >= 3) {
            console.warn('Switching providers due to failure threshold');
            this.providerFailures[this.currentProviderIndex] = 0;
        }
    }

    async processQueue() {
        if (this.emailSendCount < this.emailRateLimit && this.emailQueue.length > 0) {
            const email = this.emailQueue.shift();
            if (email) {
                this.emailSendCount++;
                await this.sendEmailWithRetry(email, 0);
                this.emailSendCount--;
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sendEmail(email) {
        if (!this.status.has(email)) {
            this.status.set(email, { email, status: 'pending', retries: 0, timestamp: Date.now() });
            this.emailQueue.push(email);
            this.emailEmitter.emit('emailQueued', email);
            console.log(`Email queued: ${email}`);
        } else {
            console.log(`Email already queued or sent: ${email}`);
        }
    }

    getStatus(email) {
        return this.status.get(email);
    }

    onEmailQueued(callback) {
        this.emailEmitter.on('emailQueued', callback);
    }

    stopProcessing() {
        clearInterval(this.processQueueInterval);
    }
}

// Export the EmailService class
module.exports = { EmailService, MockEmailProvider };
