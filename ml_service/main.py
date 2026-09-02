from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import pandas as pd
import numpy as np
import os
import json
import asyncio
from typing import List, Optional
from bson import ObjectId
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from cachetools import TTLCache
import logging
import threading

# Import our new modules
from embeddings import get_embedding, has_api_key
from milvus_client import init_collection, insert_books, search_similar
try:
    from confluent_kafka import Consumer, KafkaError
except ImportError:
    Consumer = KafkaError = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# --- CONFIGURATION ---
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "test")
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "")

# Global Cache
rec_cache = TTLCache(maxsize=500, ttl=300)
df_books = None
popularity_scores = None

# DB & Milvus
client = None
db = None
books_collection = None
users_collection = None
milvus_col = None

# Kafka Consumer flag
run_consumer = True

def connect_db():
    global client, db, books_collection, users_collection
    try:
        if not MONGO_URI:
            raise RuntimeError("MONGO_URI is required")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client[DB_NAME]
        books_collection = db["books"]
        users_collection = db["users"]
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"DB Connection Error: {e}")

def load_data():
    global df_books, popularity_scores, milvus_col
    logger.info("Loading data from MongoDB for Semantic Search...")

    if books_collection is None:
        logger.warning("MongoDB is unavailable; recommendation snapshot was not loaded.")
        return
    cursor = books_collection.find({"privacy": "public"}, {
        "_id": 1, "title": 1, "genres": 1, "desc": 1, "authorName": 1,
        "rating": 1, "likes": 1, "views": 1, "addedByCount": 1
    })

    df_books = pd.DataFrame(list(cursor))
    if df_books.empty:
        logger.warning("No public books found.")
        return

    df_books['_id'] = df_books['_id'].astype(str)
    df_books['genres'] = df_books['genres'].apply(lambda x: x if isinstance(x, list) else [])
    df_books['desc'] = df_books['desc'].fillna('')
    df_books['authorName'] = df_books['authorName'].fillna('')

    df_books['rating'] = df_books.get('rating', pd.Series(dtype=float)).fillna(0)
    df_books['addedByCount'] = df_books.get('addedByCount', pd.Series(dtype=int)).fillna(0)
    df_books['views'] = df_books.get('views', pd.Series(dtype=int)).fillna(0)

    max_added = df_books['addedByCount'].max() or 1
    max_views = df_books['views'].max() or 1
    popularity_scores = (
        0.4 * (df_books['rating'] / 5.0) +
        0.3 * (df_books['addedByCount'] / max_added) +
        0.3 * (df_books['views'] / max_views)
    ).values

    # Embed and store in Milvus
    if has_api_key and milvus_col:
        # Check if already populated (for demo, we just populate anyway)
        logger.info("Generating embeddings for Milvus...")
        book_ids = []
        embeddings = []
        for _, row in df_books.iterrows():
            text_to_embed = f"Title: {row['title']}. Genres: {', '.join(row['genres'])}. Description: {row['desc']}. Author: {row['authorName']}"
            emb = get_embedding(text_to_embed)
            book_ids.append(row['_id'])
            embeddings.append(emb)

        insert_books(milvus_col, book_ids, embeddings)

    rec_cache.clear()
    logger.info("Data loaded successfully.")

def kafka_consumer_thread():
    global run_consumer
    if not KAFKA_BROKERS or Consumer is None:
        logger.info("Kafka is disabled; use /refresh after bulk catalog changes.")
        return
    try:
        conf = {
            'bootstrap.servers': KAFKA_BROKERS,
            'group.id': 'ml-service-group',
            'auto.offset.reset': 'latest'
        }
        consumer = Consumer(conf)
        consumer.subscribe(['book.viewed', 'book.liked', 'book.created'])

        logger.info("Kafka consumer started listening...")
        while run_consumer:
            msg = consumer.poll(1.0)
            if msg is None: continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    logger.error(msg.error())
                continue

            topic = msg.topic()
            data = json.loads(msg.value().decode('utf-8'))
            logger.info(f"Received Kafka event on {topic}: {data}")

            # If a new book is created, reload data to index it
            if topic == 'book.created':
                load_data()

    except Exception as e:
        logger.warning(f"Kafka consumer failed. Is Kafka running? {e}")

# --- LIFESPAN ---
@asynccontextmanager
async def lifespan(app):
    global milvus_col, run_consumer
    connect_db()
    milvus_col = init_collection()
    load_data()

    # Start Kafka consumer in background
    if KAFKA_BROKERS and Consumer is not None:
        t = threading.Thread(target=kafka_consumer_thread, daemon=True)
        t.start()

    yield

    run_consumer = False
    if client is not None:
        client.close()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CLIENT_URLS", "http://localhost:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserLibrary(BaseModel):
    book_ids: List[str]

@app.post("/recommend")
async def recommend(user_library: UserLibrary, background_tasks: BackgroundTasks):
    if df_books is None or df_books.empty:
        return {"recommendations": []}

    if not user_library.book_ids:
        return {"recommendations": []}

    cache_key = tuple(sorted(user_library.book_ids))
    if cache_key in rec_cache:
        return {"recommendations": rec_cache[cache_key]}

    # Collect user preferences based on library
    user_books = df_books[df_books['_id'].isin(user_library.book_ids)]
    if user_books.empty:
        return {"recommendations": []}

    # 1. Milvus Semantic Search
    recommended_from_milvus = {}
    if milvus_col and has_api_key:
        # Create an average embedding of their library for a user profile
        user_texts = [f"{r['title']} {r['desc']}" for _, r in user_books.iterrows()]
        avg_emb = np.mean([get_embedding(t) for t in user_texts], axis=0).tolist()

        milvus_results = search_similar(
            milvus_col,
            avg_emb,
            limit=20,
            exclude_ids=user_library.book_ids
        )

        # Max cosine similarity is 1
        for book_id, distance in milvus_results:
            recommended_from_milvus[book_id] = distance

    # 2. Hybrid Scoring
    final_scores = []
    input_ids_set = set(user_library.book_ids)

    # Extract user author and genre preferences
    user_authors = set(user_books['authorName'])
    user_genres = {}
    for genres in user_books['genres']:
        for g in genres:
            user_genres[g] = user_genres.get(g, 0) + 1

    for i, row in df_books.iterrows():
        book_id = row['_id']
        if book_id in input_ids_set: continue

        score = 0.0

        # Semantic score (0.45 weight)
        if book_id in recommended_from_milvus:
            score += recommended_from_milvus[book_id] * 0.45

        # Popularity score (0.15 weight)
        if popularity_scores is not None and i < len(popularity_scores):
            score += popularity_scores[i] * 0.15

        # Author match (0.15 weight)
        if row['authorName'] in user_authors:
            score += 0.15

        # Genre match (0.25 weight)
        overlap = sum(1 for g in row['genres'] if g in user_genres)
        if overlap > 0:
            score += min(overlap * 0.1, 0.25)

        final_scores.append((book_id, score))

    final_scores.sort(key=lambda x: x[1], reverse=True)
    top_15 = [bid for bid, _ in final_scores[:15]]

    rec_cache[cache_key] = top_15
    return {"recommendations": top_15}

@app.post("/refresh")
async def refresh_data(background_tasks: BackgroundTasks):
    background_tasks.add_task(load_data)
    return {"message": "Data reload triggered"}

@app.get("/trending")
async def get_trending():
    if df_books is None or df_books.empty: return {"trending": []}
    try:
        trending = books_collection.find(
            {"privacy": "public"}, {"_id": 1}
        ).sort("addedByCount", -1).limit(20)
        return {"trending": [str(b['_id']) for b in trending]}
    except:
        return {"trending": []}

@app.get("/genres")
async def get_genres():
    if books_collection is None: return {"genres": []}
    try:
        pipeline = [
            {"$match": {"privacy": "public"}},
            {"$unwind": "$genres"},
            {"$group": {"_id": "$genres", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        results = list(books_collection.aggregate(pipeline))
        return {"genres": [{"name": r['_id'], "count": r['count']} for r in results]}
    except:
        return {"genres": []}
