import os
import logging
from typing import List, Optional
from telethon import TelegramClient
from telethon.tl.types import Message
import psycopg
from psycopg.rows import dict_row
from datetime import datetime, timezone
from simhash import Simhash
from .embedder import Embedder

logger = logging.getLogger(__name__)


class TelegramParser:
    def __init__(self):
        self.api_id = int(os.getenv("TELEGRAM_API_ID", "0"))
        self.api_hash = os.getenv("TELEGRAM_API_HASH", "")
        self.db_url = os.getenv("DATABASE_URL")
        self.embedder = Embedder()

        if self.api_id and self.api_hash:
            self.client = TelegramClient(
                "ingest_session", self.api_id, self.api_hash
            )
        else:
            logger.warning("Telegram API credentials not set")
            self.client = None

    async def process_source(self, source_id: str):
        """Process a single Telegram source"""
        if not self.client:
            logger.error("Telegram client not initialized")
            return

        async with psycopg.connect(self.db_url, row_factory=dict_row) as conn:
            async with conn.cursor() as cur:
                # Get source details
                await cur.execute(
                    "SELECT * FROM sources WHERE id = %s AND type = 'telegram'",
                    (source_id,)
                )
                source = await cur.fetchone()

                if not source:
                    logger.error(f"Source {source_id} not found")
                    return

                handle = source["handle_or_url"]
                logger.info(f"Processing Telegram channel: {handle}")

                # Get last fetched message ID
                await cur.execute(
                    "SELECT last_item_id FROM ingest_state WHERE source_id = %s",
                    (source_id,)
                )
                state = await cur.fetchone()
                last_id = int(state["last_item_id"]) if state and state["last_item_id"] else None

                # Connect and fetch messages
                await self.client.start()

                channel = await self.client.get_entity(handle)
                messages: List[Message] = []

                async for message in self.client.iter_messages(
                    channel, limit=100, min_id=last_id or 0
                ):
                    if message.text:
                        messages.append(message)

                logger.info(f"Fetched {len(messages)} new messages from {handle}")

                # Process messages
                for msg in reversed(messages):  # Process oldest first
                    await self._process_message(conn, source_id, msg)

                # Update last fetched
                if messages:
                    last_msg_id = max(m.id for m in messages)
                    await cur.execute(
                        """
                        INSERT INTO ingest_state (source_id, last_item_id, updated_at)
                        VALUES (%s, %s, NOW())
                        ON CONFLICT (source_id)
                        DO UPDATE SET last_item_id = EXCLUDED.last_item_id, updated_at = NOW()
                        """,
                        (source_id, str(last_msg_id))
                    )
                    await conn.commit()

    async def _process_message(self, conn, source_id: str, msg: Message):
        """Process a single message"""
        text = msg.text
        title = text.split("\n")[0][:200] if text else "Untitled"

        # Deduplication using simhash
        text_hash = str(Simhash(text).value)

        async with conn.cursor() as cur:
            # Check if already exists
            await cur.execute(
                "SELECT id FROM documents WHERE source_id = %s AND text = %s",
                (source_id, text)
            )
            if await cur.fetchone():
                return

            # Classify document type
            doc_type = self._classify_doc_type(text)

            # Generate embedding
            embedding_vec = self.embedder.encode(f"{title} {text[:512]}")
            embedding_list = embedding_vec.tolist()

            # Insert document
            await cur.execute(
                """
                INSERT INTO documents (id, source_id, doc_type, title, text, published_at, embedding)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s::vector)
                """,
                (
                    source_id,
                    doc_type,
                    title,
                    text,
                    msg.date.astimezone(timezone.utc),
                    embedding_list
                )
            )
            await conn.commit()
            logger.info(f"Inserted document: {title}")

    def _classify_doc_type(self, text: str) -> str:
        """Simple keyword-based classification"""
        text_lower = text.lower()

        if any(kw in text_lower for kw in ["отключ", "электричество", "вода", "газ"]):
            return "outage"
        elif any(kw in text_lower for kw in ["мероприят", "событ", "концерт", "фестиваль"]):
            return "event"
        elif any(kw in text_lower for kw in ["тренир", "секци", "спорт"]):
            return "event"
        else:
            return "news"