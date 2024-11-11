const config = require('./config.js');

class Logger {
    httpLogger = (req, res, next) => {
        let send = res.send;

        res.send = (resBody) => {
            const logData = {
                authorized: !!req.headers.authorization,
                path: `${req.hostname}${req.originalUrl}`,
                ip: req.ip,
                method: req.method,
                statusCode: res.statusCode,
                req: JSON.stringify(req.body),
                res: resBody
            };

            let level = 'info';
            if (res.statusCode >= 500) {
                level = 'error';
            } else if (res.statusCode >= 400) {
                level = 'warn';
            }

            this.log(level, 'http', logData)
            res.send = send;
            return res.send(resBody);
        }

        next();
    }

    log(level, type, logData){
        logData = this.sanitize(logData);

        const labels = { component: config.logging.source, level: level, type: type };
        const timestamp = (Math.floor(Date.now()) * 1000000).toString();
        const values = [timestamp, logData];
        const finalLog = { streams: [{ stream: labels, values: [values] }] };

        this.sendLogToGrafana(finalLog);
    }

    sendLogToGrafana(log) { //given func
        const body = JSON.stringify(log);
        
        fetch(`${config.logging.url}`, {
            method: 'post',
            body: body,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
            },
        }).then((res) => {
            if (!res.ok) console.log('Failed to send log to Grafana');
        });
    }

    sanitize(logData) { //remove priv info with regex
        logData = JSON.stringify(logData);
        logData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"******\\"');
        logData = logData.replace(/\\"token\\":\s*\\"[^"]*\\"/g, '\\"token\\": \\"******\\"');
        return logData;
    }
}

module.exports = new Logger();