import { startIdleListener } from './processor';
import { logger } from './logger';

startIdleListener().catch(err => {
    logger.fatal({ err: err.message }, 'FATAL — process stopped');
    process.exit(1);
});