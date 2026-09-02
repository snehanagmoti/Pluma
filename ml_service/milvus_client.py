import os
import logging
import json

try:
    from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility
    MILVUS_AVAILABLE = True
except ImportError:
    connections = Collection = FieldSchema = CollectionSchema = DataType = utility = None
    MILVUS_AVAILABLE = False

logger = logging.getLogger(__name__)

MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
COLLECTION_NAME = "pluma_books"

def connect_milvus():
    if not MILVUS_AVAILABLE or not os.getenv("MILVUS_HOST"):
        logger.info("Milvus is disabled; using the backend's zero-cost hybrid recommender.")
        return False
    try:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        logger.info(f"Connected to Milvus at {MILVUS_HOST}:{MILVUS_PORT}")
        return True
    except Exception as e:
        logger.warning(f"Could not connect to Milvus: {e}")
        return False

def init_collection():
    if not connect_milvus():
        return None

    if utility.has_collection(COLLECTION_NAME):
        collection = Collection(COLLECTION_NAME)
        collection.load()
        return collection

    # Create collection
    fields = [
        FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, max_length=100),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768)
    ]
    schema = CollectionSchema(fields, "Book semantic embeddings")
    collection = Collection(COLLECTION_NAME, schema)
    
    # Create Index
    index_params = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 128}
    }
    collection.create_index("embedding", index_params)
    collection.load()
    
    logger.info(f"Created Milvus collection: {COLLECTION_NAME}")
    return collection

def insert_books(collection, book_ids, embeddings):
    if not collection or not book_ids or not embeddings:
        return
    
    # Delete existing to update
    expr = f"id in {json.dumps(book_ids)}"
    collection.delete(expr)
    
    collection.insert([
        book_ids,
        embeddings
    ])
    collection.flush()
    logger.info(f"Inserted {len(book_ids)} books into Milvus")

def search_similar(collection, query_vector, limit=15, exclude_ids=None):
    if not collection:
        return []

    search_params = {"metric_type": "COSINE", "params": {"nprobe": 10}}
    
    expr = None
    if exclude_ids:
        # Exclude IDs user already has
        expr = f"id not in {json.dumps(exclude_ids)}"
    
    results = collection.search(
        data=[query_vector],
        anns_field="embedding",
        param=search_params,
        limit=limit,
        expr=expr,
        output_fields=["id"]
    )
    
    hits = results[0]
    return [(hit.id, hit.distance) for hit in hits]
