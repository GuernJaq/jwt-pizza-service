const os = require('os');
const config = require('./config.js')

class MetricBuilder {
    constructor() {
        this.strings = [];
    }

    append(metricPrefix, metricName, metricValue) {
        const newMetric = `${metricPrefix},source=${config.metrics.source}${metricName}=${metricValue}`;
        this.strings.push(newMetric);
        return this;
    }

    toString(delim = '\n') {
        return this.strings.join(delim);
    }
}

class Metrics {
    constructor() {
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
                //this.userMetrics(buf); //active users
                //this.authMetrics(buf); //success and failures
                //this.purchaseMetrics(buf); //count, revenue, latency, error
                //this.httpMetrics(buf); //request types

                const metrics = buf.toString('\n');
                this.sendMetricToGrafana(metrics);
            } catch (error) {
                console.log('Error sending metrics', error);
            }
        }, period);
        timer.unref();
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