const axios = require("axios");

const OPEN_LIBRARY_URL = "https://openlibrary.org";
const cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;

const CLASSICS = [
  ["OL66554W", "Pride and Prejudice", "Jane Austen", "9780141439518", 1813, ["romance", "classic", "historical fiction"], 1342, "A witty, enduring novel about love, first impressions, family, and social expectations."],
  ["OL450063W", "Frankenstein", "Mary Shelley", "9780141439471", 1818, ["gothic", "science fiction", "horror"], 84, "A scientist's ambition gives life to a being whose loneliness becomes tragedy."],
  ["OL138052W", "Alice's Adventures in Wonderland", "Lewis Carroll", "9780141439761", 1865, ["fantasy", "children", "adventure"], 11, "Alice tumbles into a dreamlike world governed by riddles, transformations, and delightful nonsense."],
  ["OL85892W", "Dracula", "Bram Stoker", "9780141439846", 1897, ["gothic", "horror", "classic"], 345, "Letters and journals chronicle a desperate struggle against Count Dracula."],
  ["OL102749W", "Moby-Dick", "Herman Melville", "9780142437247", 1851, ["adventure", "classic", "literary fiction"], 2701, "Captain Ahab's obsessive pursuit of a white whale drives an epic voyage into fate and revenge."],
  ["OL262758W", "The Adventures of Sherlock Holmes", "Arthur Conan Doyle", "9780199536955", 1892, ["mystery", "crime", "classic"], 1661, "Twelve ingenious cases showcase Sherlock Holmes and Dr. Watson at their deductive best."],
  ["OL81196W", "The Picture of Dorian Gray", "Oscar Wilde", "9780141439570", 1890, ["gothic", "philosophical fiction", "classic"], 174, "A beautiful young man preserves his youth while a hidden portrait records the cost of his choices."],
  ["OL21177W", "Wuthering Heights", "Emily Brontë", "9780141439556", 1847, ["romance", "gothic", "classic"], 768, "A fierce, generational story of love, revenge, and the windswept Yorkshire moors."],
  ["OL220648W", "Crime and Punishment", "Fyodor Dostoevsky", "9780143058144", 1866, ["psychological fiction", "crime", "classic"], 2554, "A desperate student's crime becomes an intense examination of guilt, morality, and redemption."],
  ["OL29982W", "Little Women", "Louisa May Alcott", "9780147514011", 1868, ["family", "coming of age", "classic"], 514, "The four March sisters grow into their ambitions, relationships, and distinct ideas of a meaningful life."],
  ["OL46811W", "A Tale of Two Cities", "Charles Dickens", "9780141439600", 1859, ["historical fiction", "classic", "drama"], 98, "Lives in London and Paris converge amid sacrifice, injustice, and the French Revolution."],
  ["OL262356W", "The Odyssey", "Homer", "9780140268867", -700, ["epic", "mythology", "adventure"], 1727, "Odysseus faces monsters, gods, and temptation on his long journey home from war."],
].map(([workId, title, authorName, isbn, firstPublishYear, genres, gutenbergId, desc]) => ({
  _id: `ol:${workId}`,
  id: `ol:${workId}`,
  canonicalId: `ol:${workId}`,
  source: "openlibrary",
  isExternal: true,
  externalKey: `/works/${workId}`,
  title,
  authorName,
  isbn,
  firstPublishYear,
  year: firstPublishYear,
  genres,
  desc,
  cover: `https://covers.openlibrary.org/isbn/${isbn}-L.jpg`,
  rating: 4.1,
  ratingsCount: 100,
  views: 0,
  likes: [],
  readable: true,
  readUrl: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
  openLibraryUrl: `${OPEN_LIBRARY_URL}/works/${workId}`,
}));

const cacheGet = key => {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const cacheSet = (key, value) => {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
};

const normalizeBook = doc => {
  const workId = String(doc.key || "").replace("/works/", "");
  const internetArchiveId = Array.isArray(doc.ia) ? doc.ia[0] : "";
  const readable = Boolean(doc.public_scan_b || doc.ebook_access === "public" || internetArchiveId);
  return {
    _id: `ol:${workId}`,
    id: `ol:${workId}`,
    canonicalId: `ol:${workId}`,
    source: "openlibrary",
    isExternal: true,
    externalKey: doc.key,
    title: doc.title || "Untitled",
    authorName: doc.author_name?.slice(0, 3).join(", ") || "Unknown author",
    desc: doc.first_sentence?.[0] || "Discover this book in the Open Library catalog.",
    genres: (doc.subject || []).slice(0, 5).map(value => String(value).toLowerCase()),
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "",
    firstPublishYear: doc.first_publish_year,
    year: doc.first_publish_year,
    isbn: doc.isbn?.[0],
    language: doc.language?.[0] || "eng",
    rating: Number(doc.ratings_average || 0),
    ratingsCount: Number(doc.ratings_count || 0),
    views: 0,
    likes: [],
    readable,
    readUrl: internetArchiveId
      ? `https://archive.org/details/${encodeURIComponent(internetArchiveId)}/mode/2up`
      : `${OPEN_LIBRARY_URL}${doc.key}`,
    openLibraryUrl: `${OPEN_LIBRARY_URL}${doc.key}`,
  };
};

const searchBooks = async ({ q = "", subject = "", page = 1, limit = 24, sort = "rating" } = {}) => {
  const safeLimit = Math.min(40, Math.max(1, Number(limit) || 24));
  const safePage = Math.max(1, Number(page) || 1);
  const query = String(q || "").trim().slice(0, 120);
  const safeSubject = String(subject || "").trim().slice(0, 80);
  const cacheKey = JSON.stringify({ query, safeSubject, safePage, safeLimit, sort });
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const params = {
    page: safePage,
    limit: safeLimit,
    fields: "key,title,author_name,cover_i,first_publish_year,isbn,language,subject,first_sentence,ratings_average,ratings_count,ebook_access,public_scan_b,ia",
  };
  if (safeSubject && !query) params.subject = safeSubject;
  else params.q = query || "subject:fiction language:eng";
  if (["rating", "new", "old", "editions"].includes(sort)) params.sort = sort;

  const response = await axios.get(`${OPEN_LIBRARY_URL}/search.json`, {
    params,
    timeout: 6000,
    headers: { "User-Agent": process.env.OPEN_LIBRARY_USER_AGENT || "Pluma/1.0 (catalog integration)" },
  });
  return cacheSet(cacheKey, {
    books: (response.data.docs || []).map(normalizeBook).filter(book => book.externalKey && book.title),
    total: Number(response.data.numFound || 0),
    page: safePage,
  });
};

const fallbackSearch = query => {
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return CLASSICS;
  return CLASSICS.filter(book => words.every(word => `${book.title} ${book.authorName} ${book.genres.join(" ")}`.toLowerCase().includes(word)));
};

module.exports = { CLASSICS, searchBooks, fallbackSearch };
