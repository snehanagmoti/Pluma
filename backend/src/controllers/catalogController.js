const { CLASSICS, searchBooks, fallbackSearch } = require("../services/openLibraryService");

const searchCatalog = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const subject = String(req.query.subject || "").trim();
    const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 24));
    if (!q && !subject) return res.status(200).json({ books: CLASSICS.slice(0, limit), total: CLASSICS.length, source: "curated" });
    const result = await searchBooks({ q, subject, page: req.query.page, limit });
    const merged = [...fallbackSearch(q || subject), ...result.books]
      .filter((book, index, all) => all.findIndex(item => item.canonicalId === book.canonicalId) === index)
      .slice(0, limit);
    res.status(200).json({ ...result, books: merged, source: "openlibrary" });
  } catch (error) {
    const books = fallbackSearch(req.query.q || req.query.subject).slice(0, Math.min(40, Number(req.query.limit) || 24));
    res.status(200).json({ books, total: books.length, source: "curated-fallback", degraded: true });
  }
};

const getFeaturedCatalog = async (req, res) => {
  try {
    const result = await searchBooks({ q: "subject:fiction language:eng", limit: 24, sort: "rating" });
    const books = [...CLASSICS.slice(0, 8), ...result.books]
      .filter((book, index, all) => all.findIndex(item => item.canonicalId === book.canonicalId) === index)
      .slice(0, 24);
    res.status(200).json({ books, source: "openlibrary" });
  } catch (error) {
    res.status(200).json({ books: CLASSICS, source: "curated-fallback", degraded: true });
  }
};

module.exports = { searchCatalog, getFeaturedCatalog };
