from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import psycopg
from psycopg.rows import dict_row
import os

logger = logging.getLogger(__name__)


def setup_scheduler(telegram_parser):
    """Setup periodic ingestion jobs"""
    scheduler = AsyncIOScheduler()

    async def run_all_sources():
        """Fetch and process all active sources"""
        db_url = os.getenv("DATABASE_URL")
        async with psycopg.connect(db_url, row_factory=dict_row) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id FROM sources WHERE is_active = true AND type = 'telegram'"
                )
                sources = await cur.fetchall()

                for source in sources:
                    try:
                        await telegram_parser.process_source(source["id"])
                    except Exception as e:
                        logger.error(f"Error processing source {source['id']}: {e}")

    # Run every hour
    scheduler.add_job(
        run_all_sources,
        CronTrigger(minute=0),
        id="ingest_all",
        replace_existing=True
    )

    scheduler.start()
    logger.info("Scheduler started")