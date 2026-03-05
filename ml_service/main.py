from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import pandas as pd
import numpy as np
import os
from typing import List, Optional
from bson import ObjectId

app = FastAPI()

# --- CONFIGURATION ---
# Your MongoDB Atlas Connection String
MONGO_URI = "mongodb+srv://snehan:NoRrjhZcYIZ2BRW5@cluster0.iotirud.mongodb.net/?appName=Cluster0"
DB_NAME = "test" 

# Global variables to act as "RAM Cache"
tfidf_matrix = None
tfidf_vectorizer = None
indices = None
df_books = None

# --- DATABASE CONNECTION ---
try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    books_collection = db["books"]
    print(f"✅ Connected to MongoDB: {DB_NAME}")
except Exception as e:
    print(f"❌ DB Connection Error: {e}")

# --- DATA MODEL ---
class UserLibrary(BaseModel):
    book_ids: List[str]

# --- HELPER: DATA PREPARATION ---
def load_data():
    global tfidf_matrix, tfidf_vectorizer, indices, df_books
    
    print("🔄 Loading data from MongoDB...")
    
    # 1. Fetch only necessary fields
    cursor = books_collection.find({}, {
        "_id": 1, "title": 1, "genres": 1, "desc": 1, "authorName": 1
    })
    
    df_books = pd.DataFrame(list(cursor))
    
    if df_books.empty:
        print("⚠️ WARNING: Database is empty! No recommendations possible.")
        return

    # 2. Preprocessing
    # Ensure genres is a list (handle potential bad data)
    df_books['genres'] = df_books['genres'].apply(lambda x: x if isinstance(x, list) else [])
    
    # Create the "Soup" (The text we analyze)
    def create_soup(x):
        genre_str = ' '.join(x['genres']) * 3 
        return f"{genre_str} {x['desc']} {x['authorName']}"
    
    df_books['soup'] = df_books.apply(create_soup, axis=1)

    # 3. TF-IDF Vectorization
    tfidf_vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf_vectorizer.fit_transform(df_books['soup'])
    
    # 4. Create Index Mapping
    df_books['_id'] = df_books['_id'].astype(str)
    indices = pd.Series(df_books.index, index=df_books['_id']).drop_duplicates()
    
    print(f"✅ Model Trained on {len(df_books)} books!")

# --- API ENDPOINTS ---

@app.on_event("startup")
async def startup_event():
    load_data()

@app.post("/recommend")
async def recommend(user_library: UserLibrary):
    global tfidf_matrix, df_books, indices

    if df_books is None or df_books.empty:
        raise HTTPException(status_code=503, detail="Model not ready")
        
    if not user_library.book_ids:
        return {"recommendations": []}

    # 1. Identify User's Books in our Matrix
    valid_book_indices = []
    input_author_names = set()
    
    for bid in user_library.book_ids:
        if bid in indices:
            idx = indices[bid]
            valid_book_indices.append(idx)
            input_author_names.add(df_books.iloc[idx]['authorName'])
            
    if not valid_book_indices:
        return {"recommendations": []}

    # 2. Build User Profile Vector
    # --- FIX: Convert matrix to array explicitly ---
    user_profile = np.asarray(tfidf_matrix[valid_book_indices].mean(axis=0))

    # 3. Calculate Cosine Similarity
    cosine_sim = linear_kernel(user_profile, tfidf_matrix)

    # 4. Get Scores
    sim_scores = list(enumerate(cosine_sim[0]))
    
    # 5. Apply "Author Boost"
    final_scores = []
    for i, score in sim_scores:
        book_author = df_books.iloc[i]['authorName']
        if book_author in input_author_names:
            score += 0.2  
        final_scores.append((i, score))

    # 6. Sort & Filter
    final_scores = sorted(final_scores, key=lambda x: x[1], reverse=True)
    
    recommended_ids = []
    input_ids_set = set(user_library.book_ids)
    
    for i, score in final_scores:
        book_id = df_books.iloc[i]['_id']
        if book_id not in input_ids_set:
            recommended_ids.append(book_id)
        
        if len(recommended_ids) >= 10:
            break
            
    return {"recommendations": recommended_ids}

@app.post("/refresh")
async def refresh_data():
    load_data()
    return {"message": "Data reloaded successfully"}