const request = require('supertest');
const app = require('./service.js');
const metrics = require('./metrics.js');

test('metrics', async () => {
    const metricsToString = metrics.toString();
    expect(metricsToString == null).toBe(false);
    expect(metricsToString).toContain('pizza_user_count');

    expect(metricsToString).toContain('pizza_auth_success');
    expect(metricsToString).toContain('pizza_auth_fail');

    expect(metricsToString).toContain('pizza_http_latency');
    expect(metricsToString).toContain('pizza_http_request');

    expect(metricsToString).toContain('pizza_purchase_count');
    expect(metricsToString).toContain('pizza_purchase_revenue');
    expect(metricsToString).toContain('pizza_purchase_latency');
    expect(metricsToString).toContain('pizza_purchase_error');
    
    expect(metricsToString).toContain('pizza_system_cpu');
    expect(metricsToString).toContain('pizza_system_memory');
});