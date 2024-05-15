import winston from 'winston';

const myFormat = winston.format.printf(({ level, message, timestamp }) => {
  return message === '' ? '' : `${timestamp} [${level}] ${message}`;
});

const logger = winston.createLogger({
  level: 'debug',

  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),

    myFormat
  ),

  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'log.log' })
  ],
});

function waitForLoggerToFinish() {
  return new Promise((resolve) => {
    logger.on('finish', resolve);
  });
}

const getErrorMessage = (label, e) =>
  `${label}: ${e.message} ${e.stack.split('\n')[1].trim()}.`;

export default logger;
export { waitForLoggerToFinish, getErrorMessage };
