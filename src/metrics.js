const os = require('os');
const config = require('./config.js')

class MetricBuilder {
    constructor() {
        this.strings = [];
    }

    append(metricPrefix, metricName, metricValue) {
        const newMetric = `${metricPrefix},source=${config.metrics.source} ${metricName}=${metricValue}`;
        this.strings.push(newMetric);
        return this;
    }

    toString(delim = '\n') {
        return this.strings.join(delim);
    }
}

class Metrics {
    constructor() {
        this.purchaseCount = 0;
        this.purchaseRevenue = 0;
        this.purchaseError = 0;
        this.purchaseLatency = 0;

        this.requests = {};
        this.requestLatency = 0;

        this.authSuccess = 0;
        this.authFail = 0;
    }

    sendMetricToGrafana(metrics) {
        fetch(`${config.metrics.url}`, {
            method: 'post',
            body: metrics,
            headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
        }).catch((error) => {
            console.error('Error pushing metrics:', error);
        });
    }

    sendMetricsPeriodically(period) {
        const timer = setInterval(() => {
            try {
                const buf = new MetricBuilder();
                this.systemMetrics(buf); //mem and cpu
                this.authMetrics(buf); //success and failures
                this.purchaseMetrics(buf); //count, revenue, latency, error
                this.httpMetrics(buf); //request types
                //this.userMetrics(buf); //active users

                const metrics = buf.toString('\n');
                this.sendMetricToGrafana(metrics);
            } catch (error) {
                console.log('Error sending metrics', error);
            }
        }, period);
        timer.unref();
    }

    loginMetric = (isSuccess) => {
        if (isSuccess) {
            this.authSuccess += 1;
        } else {
            this.authFail += 1;
        }
    }

    requestTracker = (req, res, next) => {
        const method = req.method.toLowerCase();
        const currAmount = this.requests[method] ?? 0;
        this.requests[method] = currAmount + 1;

        const start = Date.now();
        let send = res.send;
        res.send = (resBody) => {
            this.requestLatency += Date.now() - start;
            res.send = send;
            return res.send(resBody);
        };

        next();
    }

    orderMetric = (newOrder) => {
        this.purchaseCount += newOrder.count;
        this.purchaseRevenue += newOrder.revenue;
        if (newOrder.error) {
            this.purchaseError += 0;
        }
        if (newOrder.start && newOrder.end) {
            const latency = newOrder.end - newOrder.start;
            this.purchaseLatency += latency;
        }
    }

    authMetrics(buf) {
        buf.append('pizza_auth_success', 'total', this.authSuccess);
        buf.append('pizza_auth_fail', 'total', this.authFail);
    }

    httpMetrics(buf) {
        buf.append('pizza_http_latency', 'total', this.requestLatency);
        const totalRequests = Object.values(this.requests).reduce((acc, curr) => acc + curr, 0);
        buf.append('pizza_http_request', 'all', totalRequests);
        Object.keys(this.requests).forEach((method) => {
            buf.append('pizza_http_request', `${method}`, this.requests[method]);
        });
    }

    purchaseMetrics(buf) {
        buf.append('pizza_purchase_count', 'total', this.purchaseCount);
        buf.append('pizza_purchase_revenue', 'total', this.purchaseRevenue);
        buf.append('pizza_purchase_latency', 'total', this.purchaseLatency);
        buf.append('pizza_purchase_error', 'total', this.purchaseError);
    }

    systemMetrics(buf) {
        buf.append('pizza_system_cpu', 'percent', this.getCpuUsagePercentage());
        buf.append('pizza_system_memory', 'used', this.getMemoryUsagePercentage());
    }

    getCpuUsagePercentage() { //given func
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
    }

    getMemoryUsagePercentage() { //given func
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
    }
}

module.exports = new Metrics();