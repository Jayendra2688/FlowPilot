import logging

logger = logging.getLogger(__name__)

def my_function():
    logger.warning("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning")
    logger.error("This is an error")