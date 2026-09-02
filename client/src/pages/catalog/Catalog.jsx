import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaGlobe, FaBookOpen } from "react-icons/fa";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import API from "../../config/axios";
import "./Catalog.css";

const SUBJECTS = ["Fiction", "Fantasy", "Romance", "Mystery", "Science Fiction", "Horror", "History", "Poetry"];

export default function Catalog() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [books, setBooks] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");

  useEffect(() => {
    API.get("/library").then(response => setSavedIds(new Set((response.data.items || []).map(item => item.canonicalId || item._id)))).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = query.trim() || subject
          ? await API.get("/catalog/search", { params: { q: query.trim(), subject: query.trim() ? "" : subject, limit: 32 } })
          : await API.get("/catalog/featured");
        if (active) { setBooks(response.data.books || []); setSource(response.data.source || ""); }
      } catch (error) {
        if (active) setBooks([]);
      } finally {
        if (active) setLoading(false);
      }
    }, query ? 450 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, subject]);

  const saveBook = async book => {
    if (savedIds.has(book.canonicalId)) return;
    try {
      await API.post("/library", { externalBook: book });
      setSavedIds(current => new Set([...current, book.canonicalId]));
    } catch (error) {}
  };

  const heading = useMemo(() => query ? `Results for “${query}”` : subject ? `${subject} books` : "Timeless books, ready to discover", [query, subject]);

  return <>
    <Topbar />
    <div className="catalogPage"><Sidebar /><main className="catalogMain">
      <header className="catalogHero"><div><span><FaGlobe /> Open catalog</span><h1>Explore real books</h1><p>Search a global bibliographic catalog and open legally available editions from Open Library, Internet Archive, or Project Gutenberg.</p></div><FaBookOpen /></header>
      <div className="catalogSearch"><FaSearch /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, author, subject, or ISBN…" /></div>
      <div className="catalogSubjects"><button className={!subject ? "active" : ""} onClick={() => { setSubject(""); setQuery(""); }}>Featured</button>{SUBJECTS.map(item => <button className={subject === item.toLowerCase() ? "active" : ""} key={item} onClick={() => { setQuery(""); setSubject(item.toLowerCase()); }}>{item}</button>)}</div>
      <div className="catalogHeading"><h2>{heading}</h2><span>{source.includes("fallback") ? "Curated public-domain shelf" : "Metadata via Open Library"}</span></div>
      <section className="catalogGrid">{loading ? Array.from({ length: 10 }).map((_, index) => <div className="bookCardSkeleton" key={index}><div className="skeleton skel-img" /></div>) : books.map(book => <BookCard key={book.canonicalId} book={book} onSave={saveBook} saved={savedIds.has(book.canonicalId)} />)}</section>
      {!loading && books.length === 0 && <div className="catalogEmpty"><h2>No matching books</h2><p>Try a broader title, author name, or subject.</p></div>}
      <p className="catalogAttribution">Catalog metadata is provided by Open Library. Availability varies by edition and region; Pluma links to the source rather than copying copyrighted text.</p>
    </main></div>
  </>;
}
