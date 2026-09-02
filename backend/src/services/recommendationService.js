const Book = require("../models/Book");
const User = require("../models/User");
const LibraryItem = require("../models/LibraryItem");
const Interaction = require("../models/Interaction");
const { CLASSICS } = require("./openLibraryService");

const clamp01 = value => Math.min(1, Math.max(0, Number(value) || 0));
const normalizeWords = values => (values || []).map(value => String(value).trim().toLowerCase()).filter(Boolean);
const canonicalFor = book => book.canonicalId || (book.isExternal ? book._id : `pluma:${book._id}`);

const similarity = (left, right) => {
  const a = new Set(normalizeWords(left.genres));
  const b = new Set(normalizeWords(right.genres));
  const union = new Set([...a, ...b]);
  const intersection = [...a].filter(value => b.has(value)).length;
  const genreSimilarity = union.size ? intersection / union.size : 0;
  const authorSimilarity = left.authorName && right.authorName && left.authorName.toLowerCase() === right.authorName.toLowerCase() ? 1 : 0;
  return 0.8 * genreSimilarity + 0.2 * authorSimilarity;
};

const buildProfile = (items, user) => {
  const genres = new Map();
  const authors = new Map();
  const add = (map, value, weight = 1) => map.set(value, (map.get(value) || 0) + weight);
  for (const item of items) {
    const book = item.book || item.snapshot || {};
    normalizeWords(book.genres).forEach(genre => add(genres, genre, item.status === "finished" ? 1.5 : 1));
    if (book.authorName) add(authors, book.authorName.toLowerCase(), item.status === "finished" ? 1.5 : 1);
  }
  normalizeWords(user?.readingStats?.favoriteGenres).forEach(genre => add(genres, genre, 0.75));
  const maxGenre = Math.max(1, ...genres.values());
  const maxAuthor = Math.max(1, ...authors.values());
  return {
    genres: new Map([...genres].map(([key, value]) => [key, value / maxGenre])),
    authors: new Map([...authors].map(([key, value]) => [key, value / maxAuthor])),
  };
};

const collaborativeScores = async savedItems => {
  const saved = savedItems.map(item => item.canonicalId);
  if (!saved.length) return new Map();
  const peerRows = await LibraryItem.aggregate([
    { $match: { canonicalId: { $in: saved } } },
    { $group: { _id: "$user", overlap: { $sum: 1 } } },
    { $sort: { overlap: -1 } },
    { $limit: 250 },
  ]);
  const peerWeight = new Map(peerRows.map(row => [String(row._id), row.overlap / saved.length]));
  if (!peerWeight.size) return new Map();
  const peerItems = await LibraryItem.find({ user: { $in: peerRows.map(row => row._id) }, canonicalId: { $nin: saved } }).select("user canonicalId status").limit(5000).lean();
  const scores = new Map();
  for (const item of peerItems) {
    const weight = (peerWeight.get(String(item.user)) || 0) * (item.status === "finished" ? 1.35 : 1);
    scores.set(item.canonicalId, (scores.get(item.canonicalId) || 0) + weight);
  }
  const max = Math.max(1, ...scores.values());
  return new Map([...scores].map(([key, value]) => [key, value / max]));
};

const rankCandidates = ({ candidates, savedIds, profile, collaborative, negativeIds, mode }) => {
  const popularityValues = candidates.map(book => Math.log1p((book.views || 0) + (book.addedByCount || 0) * 4 + (book.likes?.length || 0) * 3 + (book.ratingsCount || 0)));
  const maxPopularity = Math.max(1, ...popularityValues);
  return candidates
    .filter(book => !savedIds.has(canonicalFor(book)) && !negativeIds.has(canonicalFor(book)))
    .map((book, index) => {
      const genres = normalizeWords(book.genres);
      const genreAffinity = genres.length ? Math.max(0, ...genres.map(genre => profile.genres.get(genre) || 0)) : 0;
      const authorAffinity = profile.authors.get(String(book.authorName || "").toLowerCase()) || 0;
      const content = clamp01(0.78 * genreAffinity + 0.22 * authorAffinity);
      const collaborativeScore = collaborative.get(canonicalFor(book)) || 0;
      const popularity = popularityValues[index] / maxPopularity;
      const rating = clamp01((Number(book.rating) || 0) / 5);
      const ratingsCount = Math.max(0, Number(book.ratingCount ?? book.ratingsCount) || 0);
      const quality = clamp01(((ratingsCount / (ratingsCount + 25)) * rating) + ((25 / (ratingsCount + 25)) * 0.72));
      const ageDays = book.createdAt ? Math.max(0, (Date.now() - new Date(book.createdAt).getTime()) / 86400000) : 3650;
      const freshness = book.isExternal ? 0.2 : Math.exp(-ageDays / 240);
      const novelty = 1 - popularity;
      const exploration = profile.genres.size === 0 ? 0.8 : genres.some(genre => !profile.genres.has(genre)) ? 0.75 : 0.25;
      const weights = mode === "trending"
        ? { content: 0.12, collaborative: 0.12, quality: 0.2, popularity: 0.44, freshness: 0.12, novelty: 0, exploration: 0 }
        : { content: 0.3, collaborative: 0.23, quality: 0.14, popularity: 0.09, freshness: 0.08, novelty: 0.08, exploration: 0.08 };
      const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + ({ content, collaborative: collaborativeScore, quality, popularity, freshness, novelty, exploration }[key] * weight), 0);
      const reasons = [];
      if (genreAffinity > 0.45 && genres.length) reasons.push(`Matches your interest in ${genres.find(genre => profile.genres.has(genre)) || genres[0]}`);
      if (collaborativeScore > 0.2) reasons.push("Loved by readers with similar libraries");
      if (quality > 0.7) reasons.push("Strong reader quality signals");
      if (popularity > 0.65) reasons.push("Trending with the Pluma community");
      if (!reasons.length) reasons.push(profile.genres.size ? "A fresh pick to broaden your shelf" : "A highly regarded place to start");
      return { ...book, canonicalId: canonicalFor(book), recommendation: { score: Number(score.toFixed(4)), reasons: reasons.slice(0, 2), signals: { content, collaborative: collaborativeScore, quality, popularity, freshness, novelty } } };
    })
    .sort((a, b) => b.recommendation.score - a.recommendation.score);
};

// Greedy maximal-marginal-relevance reranking avoids a monotonous shelf of the
// same author/genre while retaining most of the personalized relevance.
const diversify = (ranked, limit) => {
  const selected = [];
  const remaining = ranked.slice(0, Math.max(80, limit * 4));
  while (selected.length < limit && remaining.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    remaining.forEach((candidate, index) => {
      const redundancy = selected.length ? Math.max(...selected.map(chosen => similarity(candidate, chosen))) : 0;
      const score = 0.88 * candidate.recommendation.score - 0.12 * redundancy;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
};

const getRecommendations = async (userId, { limit = 24, mode = "personalized" } = {}) => {
  const safeLimit = Math.min(48, Math.max(1, Number(limit) || 24));
  const [user, savedItems, localBooks, negativeInteractions] = await Promise.all([
    User.findById(userId).select("readingStats").lean(),
    LibraryItem.find({ user: userId }).populate({ path: "book", options: { lean: true } }).lean(),
    Book.find({ privacy: "public", $or: [{ status: "published" }, { status: { $exists: false } }], userId: { $ne: String(userId) } }).sort({ views: -1, createdAt: -1 }).limit(350).lean(),
    Interaction.find({ user: userId, event: "dismiss", createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } }).select("canonicalId").lean(),
  ]);
  const savedIds = new Set(savedItems.map(item => item.canonicalId));
  const [collaborative, profile] = await Promise.all([
    collaborativeScores(savedItems),
    Promise.resolve(buildProfile(savedItems, user)),
  ]);
  const candidates = [...localBooks, ...CLASSICS];
  const ranked = rankCandidates({ candidates, savedIds, profile, collaborative, negativeIds: new Set(negativeInteractions.map(item => item.canonicalId)), mode });
  return {
    books: diversify(ranked, safeLimit),
    strategy: profile.genres.size ? "hybrid-personalized-diverse" : "quality-trending-exploration",
    profile: { topGenres: [...profile.genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([genre]) => genre) },
  };
};

module.exports = { getRecommendations };
