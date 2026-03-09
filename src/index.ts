import { startIdleListener } from './processor';
import { logger } from './logger';

startIdleListener().catch(err => {
    logger.fatal({ err: err.message }, 'FATAL — proses dayandırıldı');
    process.exit(1);
});