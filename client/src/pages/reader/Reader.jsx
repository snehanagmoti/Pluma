import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaBars, FaChevronLeft, FaChevronRight, FaCompress, FaExpand, FaMoon, FaSun } from "react-icons/fa";
import API from "../../config/axios";
import SafeRichText from "../../components/safeRichText/SafeRichText";
import "./Reader.css";

export default function Reader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [book, setBook] = useState(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("pluma_reader_font")) || 20);
  const [lineHeight, setLineHeight] = useState(() => Number(localStorage.getItem("pluma_reader_line")) || 1.85);
  const [measure, setMeasure] = useState(() => Number(localStorage.getItem("pluma_reader_measure")) || 720);
  const [palette, setPalette] = useState(() => localStorage.getItem("pluma_reader_palette") || "paper");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([API.get(`/books/${bookId}`), API.get(`/reading/${bookId}`)])
      .then(([bookResponse, progressResponse]) => {
        if (!active) return;
        setBook(bookResponse.data);
        const saved = progressResponse.data.progress || {};
        setChapterIndex(Math.min(Math.max(0, saved.chapterIndex || 0), Math.max(0, (bookResponse.data.chapters?.length || 1) - 1)));
        setProgress(saved.scrollPercent || 0);
        requestAnimationFrame(() => {
          const root = contentRef.current;
          if (root && saved.scrollPercent) root.scrollTop = ((root.scrollHeight - root.clientHeight) * saved.scrollPercent) / 100;
        });
      })
      .catch(requestError => setError(requestError.response?.data?.message || "This book could not be opened."))
      .finally(() => active && setLoading(false));
    return () => { active = false; clearTimeout(saveTimerRef.current); };
  }, [bookId]);

  useEffect(() => {
    localStorage.setItem("pluma_reader_font", fontSize);
    localStorage.setItem("pluma_reader_line", lineHeight);
    localStorage.setItem("pluma_reader_measure", measure);
    localStorage.setItem("pluma_reader_palette", palette);
  }, [fontSize, lineHeight, measure, palette]);

  const persistProgress = useCallback((nextProgress, nextChapter = chapterIndex) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const lastChapter = nextChapter === Math.max(0, (book?.chapters?.length || 1) - 1);
      API.put(`/reading/${bookId}`, { chapterIndex: nextChapter, scrollPercent: nextProgress, completed: lastChapter && nextProgress >= 95 }).catch(() => undefined);
    }, 650);
  }, [book?.chapters?.length, bookId, chapterIndex]);

  const onScroll = event => {
    const element = event.currentTarget;
    const available = element.scrollHeight - element.clientHeight;
    const next = available > 0 ? Math.min(100, Math.max(0, (element.scrollTop / available) * 100)) : 100;
    setProgress(next);
    persistProgress(next);
  };

  const openChapter = useCallback(index => {
    if (!book?.chapters?.[index]) return;
    setChapterIndex(index);
    setProgress(0);
    setDrawerOpen(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
    persistProgress(0, index);
  }, [book?.chapters, persistProgress]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === "ArrowLeft" && chapterIndex > 0) openChapter(chapterIndex - 1);
      if (event.key === "ArrowRight" && chapterIndex < (book?.chapters?.length || 1) - 1) openChapter(chapterIndex + 1);
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book?.chapters?.length, chapterIndex, openChapter]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };

  if (loading) return <main className="readerState">Opening your reader…</main>;
  if (error || !book) return <main className="readerState"><h1>Unable to open book</h1><p>{error}</p><button onClick={() => navigate(-1)}>Go back</button></main>;
  const chapter = book.chapters?.[chapterIndex];

  return <main className={`readerShell readerPalette-${palette}`}>
    <div className="readerProgress"><span style={{ width: `${progress}%` }} /></div>
    <header className={`readerToolbar ${controlsOpen ? "" : "readerToolbarHidden"}`}>
      <button onClick={() => navigate(`/book/${bookId}`)} aria-label="Return to book"><FaArrowLeft /></button>
      <button onClick={() => setDrawerOpen(value => !value)} aria-label="Open chapters"><FaBars /></button>
      <div className="readerIdentity"><strong>{book.title}</strong><span>{chapter?.title || `Chapter ${chapterIndex + 1}`}</span></div>
      <div className="readerTools">
        <button onClick={() => setFontSize(value => Math.max(15, value - 1))} aria-label="Decrease font">A−</button>
        <button onClick={() => setFontSize(value => Math.min(30, value + 1))} aria-label="Increase font">A+</button>
        <select value={measure} onChange={event => setMeasure(Number(event.target.value))} aria-label="Page width"><option value="620">Narrow</option><option value="720">Balanced</option><option value="860">Wide</option></select>
        <select value={lineHeight} onChange={event => setLineHeight(Number(event.target.value))} aria-label="Line spacing"><option value="1.6">Compact</option><option value="1.85">Comfort</option><option value="2.1">Airy</option></select>
        <button onClick={() => setPalette(value => value === "night" ? "paper" : "night")} aria-label="Toggle reader palette">{palette === "night" ? <FaSun /> : <FaMoon />}</button>
        <button onClick={toggleFullscreen} aria-label="Toggle full screen">{document.fullscreenElement ? <FaCompress /> : <FaExpand />}</button>
      </div>
    </header>

    <aside className={`readerDrawer ${drawerOpen ? "readerDrawerOpen" : ""}`}>
      <h2>Chapters</h2>
      {(book.chapters || []).map((item, index) => <button key={item._id || index} className={index === chapterIndex ? "active" : ""} onClick={() => openChapter(index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.title || `Chapter ${index + 1}`}</button>)}
    </aside>
    {drawerOpen && <button className="readerScrim" onClick={() => setDrawerOpen(false)} aria-label="Close chapter drawer" />}

    <section ref={contentRef} className="readerCanvas" onScroll={onScroll} onClick={() => setControlsOpen(true)}>
      <article style={{ "--reader-size": `${fontSize}px`, "--reader-line": lineHeight, "--reader-measure": `${measure}px` }}>
        <p className="readerKicker">Chapter {chapterIndex + 1} of {book.chapters?.length || 1}</p>
        <h1>{chapter?.title || `Chapter ${chapterIndex + 1}`}</h1>
        {chapter ? <SafeRichText html={chapter.content} className="readerText" /> : <p className="readerEmpty">This chapter is still waiting to be written.</p>}
        <nav className="readerChapterNav">
          <button disabled={chapterIndex === 0} onClick={() => openChapter(chapterIndex - 1)}><FaChevronLeft /> Previous</button>
          <button disabled={chapterIndex >= (book.chapters?.length || 1) - 1} onClick={() => openChapter(chapterIndex + 1)}>Next <FaChevronRight /></button>
        </nav>
      </article>
    </section>
  </main>;
}
