import React, { useState, useEffect, useMemo, useRef } from "react";
import "./Write.css";
import Topbar from "../../components/topbar/Topbar";
import API from "../../config/axios";
import RelationshipWeb from "../../components/relationshipWeb/RelationshipWeb";
import { useNavigate, useParams } from "react-router-dom";
import { FaPlus, FaTrash, FaMagic, FaFeatherAlt, FaCheckCircle, FaUserFriends, FaGlobeAmericas, FaBookOpen, FaChartLine, FaComments, FaShieldAlt, FaMapMarkerAlt, FaColumns, FaCodeBranch, FaHeadphones, FaPlay, FaStop } from "react-icons/fa";
import { MdAutoFixHigh, MdOutlineClose, MdAutoAwesome, MdBrush, MdAccountTree, MdExplore, MdGroups, MdHighlight, MdHub, MdAlternateEmail } from "react-icons/md";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const GENRE_OPTIONS = [
  "fiction", "non-fiction", "fantasy", "romance", "mystery", "thriller",
  "science fiction", "horror", "adventure", "historical", "biography",
  "self-help", "poetry", "drama", "comedy", "children", "young adult"
];

export default function Write() {
  const navigate = useNavigate();
  const { bookId } = useParams();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [genres, setGenres] = useState([]);
  const [cover, setCover] = useState("");
  const [chapters, setChapters] = useState([{ title: "Chapter 1", content: "", summary: "" }]);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [privacy, setPrivacy] = useState("public");
  const [projectStatus, setProjectStatus] = useState("draft");
  const [publishing, setPublishing] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  // AI Panel (existing)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [tone, setTone] = useState("");

  // Story Generator Wizard (existing)
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyForm, setStoryForm] = useState({
    prompt: "",
    chaptersCount: 3,
    language: "English",
    wordLimit: 500,
    tone: "Creative",
    includeMedia: true
  });
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // ─── NEW STATE: Story Context (RAG) ───
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [storyContext, setStoryContext] = useState({
    characters: [],
    locations: [],
    factions: [],
    items: [],
    snippets: [],
    worldRules: [],
    plotSummary: "",
    tone: "",
    authorStyleGuide: "",
  });
  const [newCharacter, setNewCharacter] = useState({ name: "", description: "", traits: "" });
  const [newWorldRule, setNewWorldRule] = useState("");
  const [newLocation, setNewLocation] = useState({ name: "", description: "", sensoryDetails: "", significance: "" });
  const [newFaction, setNewFaction] = useState({ name: "", description: "", members: "", goals: "" });
  const [newItem, setNewItem] = useState({ name: "", description: "", owner: "", significance: "" });
  const [newSnippet, setNewSnippet] = useState({ label: "", content: "", tags: "" });

  // ─── NEW STATE: Character Chat ───
  const [showCharacterChat, setShowCharacterChat] = useState(false);
  const [chatCharacter, setChatCharacter] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // ─── NEW STATE: Continuity Audit ───
  const [showAudit, setShowAudit] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // ─── NEW STATE: Multi-Agent Writer's Room ───
  const [showWritersRoom, setShowWritersRoom] = useState(false);
  const [writersRoomInput, setWritersRoomInput] = useState("");
  const [writersRoomStep, setWritersRoomStep] = useState(0); // 0=idle, 1=interpreting, 2=drafting, 3=polishing, 4=done
  const [writersRoomResult, setWritersRoomResult] = useState({ beats: "", draft: "", final: "" });

  // ─── NEW STATE: Variations ───
  const [showVariations, setShowVariations] = useState(false);
  const [variations, setVariations] = useState([]);
  const [activeVariation, setActiveVariation] = useState(0);
  const [variationsLoading, setVariationsLoading] = useState(false);

  // ─── NEW STATE: Narrative Analysis ───
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [narrativeAnalysis, setNarrativeAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // ─── Advanced Writer Lab ───
  const [showBranches, setShowBranches] = useState(false);
  const [branchPrompt, setBranchPrompt] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [showBetaReaders, setShowBetaReaders] = useState(false);
  const [betaReaders, setBetaReaders] = useState([]);
  const [betaLoading, setBetaLoading] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [relationshipData, setRelationshipData] = useState(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [showTellPanel, setShowTellPanel] = useState(false);
  const [showTellFindings, setShowTellFindings] = useState([]);
  const [showTellLoading, setShowTellLoading] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusConfig, setFocusConfig] = useState({ soundscape: "rain", palette: "midnight", mood: "quiet creative focus", reason: "" });
  const [loreQuery, setLoreQuery] = useState(null);

  const chatMessagesRef = useRef(null);
  const quillRef = useRef(null);
  const audioContextRef = useRef(null);
  const soundNodesRef = useRef([]);
  const projectLoadedRef = useRef(false);

  // Build the RAG payload to send with AI requests
  const buildRAGPayload = () => ({
    storyContext,
    chapters: chapters.map(ch => ({
      title: ch.title,
      content: ch.content,
      summary: ch.summary || "",
    })),
    currentChapterIdx: activeChapterIdx,
    genre: genres[0] || "fiction",
    tone,
  });

  const loreEntries = useMemo(() => [
    ...(storyContext.characters || []).map(entry => ({ label: entry.name, type: "Character", description: entry.description || (entry.traits || []).join(", ") })),
    ...(storyContext.locations || []).map(entry => ({ label: entry.name, type: "Location", description: entry.description || entry.sensoryDetails })),
    ...(storyContext.factions || []).map(entry => ({ label: entry.name, type: "Faction", description: entry.description || entry.goals })),
    ...(storyContext.items || []).map(entry => ({ label: entry.name, type: "Item", description: entry.description || entry.significance })),
    ...(storyContext.snippets || []).map(entry => ({ label: entry.label, type: "Lore", description: entry.content })),
  ].filter(entry => entry.label), [storyContext]);

  const currentPlainText = useMemo(
    () => (chapters[activeChapterIdx]?.content || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " "),
    [activeChapterIdx, chapters]
  );

  const detectedLore = useMemo(
    () => loreEntries.filter(entry => currentPlainText.toLowerCase().includes(entry.label.toLowerCase())),
    [currentPlainText, loreEntries]
  );

  const stopSoundscape = () => {
    soundNodesRef.current.forEach(node => {
      try { node.stop?.(); } catch (error) {}
      try { node.disconnect?.(); } catch (error) {}
    });
    soundNodesRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startSoundscape = (soundscape = "rain") => {
    stopSoundscape();
    if (soundscape === "silence") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = 0.035;
    master.connect(context.destination);

    if (soundscape === "space") {
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      oscillator.type = "sine";
      oscillator.frequency.value = 82;
      filter.type = "lowpass";
      filter.frequency.value = 240;
      oscillator.connect(filter).connect(master);
      oscillator.start();
      soundNodesRef.current = [oscillator, filter, master];
    } else {
      const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      noise.buffer = buffer;
      noise.loop = true;
      filter.type = soundscape === "fireplace" ? "bandpass" : soundscape === "ocean" ? "lowpass" : "highpass";
      filter.frequency.value = soundscape === "city" ? 900 : soundscape === "forest" ? 1400 : soundscape === "ocean" ? 420 : 1800;
      noise.connect(filter).connect(master);
      noise.start();
      soundNodesRef.current = [noise, filter, master];
    }
    audioContextRef.current = context;
  };

  // The database is the source of truth; localStorage is only an emergency,
  // per-project recovery copy for offline/browser-crash protection.
  useEffect(() => {
    if (!bookId || !projectLoadedRef.current) return undefined;
    const saveTimer = setTimeout(async () => {
      const draft = { title, desc, genres, cover, chapters, privacy, storyContext };
      localStorage.setItem(`pluma_draft_${bookId}`, JSON.stringify(draft));
      try {
        await API.put(`/books/${bookId}`, { ...draft, status: projectStatus });
        setSaveError("");
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 1800);
      } catch (error) {
        setSaveError("Offline copy saved — cloud save will retry after your next edit.");
      }
    }, 1400);
    return () => clearTimeout(saveTimer);
  }, [bookId, title, desc, genres, cover, chapters, privacy, projectStatus, storyContext]);

  // Load the selected project. This is what lets each writer own many books.
  useEffect(() => {
    if (!bookId) {
      navigate("/projects", { replace: true });
      return undefined;
    }
    let active = true;
    projectLoadedRef.current = false;
    setProjectLoading(true);
    const applyDraft = draft => {
      if (!active || !draft) return;
      setTitle(draft.title || "");
      setDesc(draft.desc || "");
      setGenres(draft.genres || []);
      setCover(draft.cover || "");
      setChapters(draft.chapters?.length ? draft.chapters : [{ title: "Chapter 1", content: "", summary: "" }]);
      setPrivacy(draft.privacy || "private");
      setProjectStatus(draft.status || (draft.privacy === "public" ? "published" : "draft"));
      setStoryContext(prev => ({
        ...prev,
        ...(draft.storyContext || {}),
        characters: draft.storyContext?.characters || [],
        locations: draft.storyContext?.locations || [],
        factions: draft.storyContext?.factions || [],
        items: draft.storyContext?.items || [],
        snippets: draft.storyContext?.snippets || [],
        worldRules: draft.storyContext?.worldRules || [],
      }));
    };
    const loadProject = async () => {
      try {
        const response = await API.get(`/books/${bookId}`);
        applyDraft(response.data);
      } catch (error) {
        const recovery = localStorage.getItem(`pluma_draft_${bookId}`);
        if (recovery) {
          try { applyDraft(JSON.parse(recovery)); setSaveError("Recovered the browser backup; reconnect to save it to your account."); } catch (parseError) {}
        } else if (active) {
          alert(error.response?.data?.message || "This writing project could not be opened.");
          navigate("/projects", { replace: true });
        }
      } finally {
        if (active) {
          projectLoadedRef.current = true;
          setProjectLoading(false);
        }
      }
    };
    loadProject();
    return () => { active = false; };
  }, [bookId, navigate]);

  useEffect(() => {
    const wovenScene = sessionStorage.getItem(`pluma_woven_scene_${bookId}`);
    if (!wovenScene) return undefined;
    sessionStorage.removeItem(`pluma_woven_scene_${bookId}`);
    const safeScene = wovenScene
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const insertTimer = setTimeout(() => {
      setChapters(current => {
        const next = [...current];
        const target = Math.min(activeChapterIdx, next.length - 1);
        next[target] = { ...next[target], content: `${next[target].content || ""}<p><br></p><p>${safeScene.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>` };
        return next;
      });
      setAutoSaved(true);
    }, 0);
    return () => clearTimeout(insertTimer);
  }, [activeChapterIdx, bookId]);

  useEffect(() => () => {
    soundNodesRef.current.forEach(node => {
      try { node.stop?.(); } catch (error) {}
      try { node.disconnect?.(); } catch (error) {}
    });
    audioContextRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (!quillRef.current || loreEntries.length === 0) return;
    const highlightTimer = setTimeout(() => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      const editorText = editor.getText();
      loreEntries.forEach(entry => {
        let start = editorText.toLowerCase().indexOf(entry.label.toLowerCase());
        while (start >= 0) {
          editor.formatText(start, entry.label.length, { background: "#fff0a8" }, "silent");
          start = editorText.toLowerCase().indexOf(entry.label.toLowerCase(), start + entry.label.length);
        }
      });
    }, 250);
    return () => clearTimeout(highlightTimer);
  }, [currentPlainText, loreEntries]);

  useEffect(() => {
    if (showCharacterChat && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading, showCharacterChat]);

  // ═══════════════════════════════════════════════════════════
  // EXISTING HANDLERS (unchanged)
  // ═══════════════════════════════════════════════════════════

  const handleAddChapter = () => {
    setChapters([...chapters, { title: `Chapter ${chapters.length + 1}`, content: "", summary: "" }]);
    setActiveChapterIdx(chapters.length);
  };

  const handleRemoveChapter = (idx) => {
    if (chapters.length <= 1) return;
    const updated = chapters.filter((_, i) => i !== idx);
    setChapters(updated);
    setActiveChapterIdx(Math.min(activeChapterIdx, updated.length - 1));
  };

  const handleChapterChange = (field, value) => {
    const updated = [...chapters];
    updated[activeChapterIdx] = { ...updated[activeChapterIdx], [field]: value };
    setChapters(updated);
  };

  const handleGenreToggle = (genre) => {
    setGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : prev.length < 5 ? [...prev, genre] : prev
    );
  };

  // AI Writing Assistant (existing — now sends RAG context)
  const handleAiAction = async (action) => {
    const content = chapters[activeChapterIdx]?.content;
    if (!content?.trim()) return;

    setAiLoading(true);
    setShowAiPanel(true);
    setAiResult("");
    try {
      const res = await API.post("/ai/write-assist", {
        text: content.replace(/<[^>]+>/g, "").substring(Math.max(0, content.length - 2000)),
        action,
        genre: genres[0] || "fiction",
        tone,
        ...buildRAGPayload(),
      });
      setAiResult(res.data.result);
    } catch (err) {
      setAiResult("AI assistant is temporarily unavailable. Please try again.");
    }
    setAiLoading(false);
  };

  const handleAiSpecial = async (endpoint) => {
    const content = chapters[activeChapterIdx]?.content || desc;
    if (!content?.trim() && endpoint !== 'brainstorm') return;

    setAiLoading(true);
    setShowAiPanel(true);
    setAiResult("");
    try {
      let payload = { text: content, genre: genres[0] || "fiction" };
      if (endpoint === 'tone-shift') payload.targetTone = tone || "dramatic";
      if (endpoint === 'brainstorm') payload = { genre: genres[0] || "fiction", context: title || "epic story" };

      const res = await API.post(`/ai/${endpoint}`, payload);
      setAiResult(res.data.result);
    } catch (err) {
      setAiResult("AI assistant is temporarily unavailable.");
    }
    setAiLoading(false);
  };

  const handleGenerateDesc = async () => {
    setAiLoading(true);
    try {
      const res = await API.post("/ai/generate-description", {
        title,
        genres,
        chapterContent: chapters[0]?.content,
      });
      setDesc(res.data.result);
    } catch (err) {
      console.error("Description generation failed:", err);
    }
    setAiLoading(false);
  };

  const handleGenerateStory = async (e) => {
    e.preventDefault();
    if (!storyForm.prompt) return alert("Please provide a prompt");
    setIsGeneratingStory(true);
    try {
      const res = await API.post("/ai/generate-story", storyForm);
      if (res.data.chapters && res.data.chapters.length > 0) {
        setChapters(res.data.chapters.map(ch => ({ ...ch, summary: "" })));
        setActiveChapterIdx(0);
        setShowStoryModal(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate story: " + err.message);
    }
    setIsGeneratingStory(false);
  };

  const insertAiResult = () => {
    if (!aiResult) return;
    insertIntoActiveChapter(aiResult);
    setShowAiPanel(false);
    setAiResult("");
  };

  const handlePublish = async () => {
    if (!title.trim()) return alert("Please add a title");
    if (!chapters[0]?.content.trim()) return alert("Please add some content");

    setPublishing(true);
    try {
      await API.put(`/books/${bookId}`, {
        title,
        desc,
        genres,
        cover: cover || undefined,
        privacy,
        chapters,
        storyContext,
        status: "published",
      });
      setProjectStatus("published");
      localStorage.removeItem(`pluma_draft_${bookId}`);
      navigate(`/book/${bookId}`);
    } catch (err) {
      alert("Failed to publish. Please try again.");
    }
    setPublishing(false);
  };

  // ═══════════════════════════════════════════════════════════
  // NEW HANDLERS — Agentic Features
  // ═══════════════════════════════════════════════════════════

  // ── Story Context (RAG) Handlers ──
  const handleAddCharacter = () => {
    if (!newCharacter.name.trim()) return;
    const char = {
      name: newCharacter.name.trim(),
      description: newCharacter.description.trim(),
      traits: newCharacter.traits.split(",").map(t => t.trim()).filter(Boolean),
    };
    setStoryContext(prev => ({
      ...prev,
      characters: [...prev.characters, char],
    }));
    setNewCharacter({ name: "", description: "", traits: "" });
  };

  const handleRemoveCharacter = (idx) => {
    setStoryContext(prev => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== idx),
    }));
  };

  const handleAddWorldRule = () => {
    if (!newWorldRule.trim()) return;
    setStoryContext(prev => ({
      ...prev,
      worldRules: [...prev.worldRules, newWorldRule.trim()],
    }));
    setNewWorldRule("");
  };

  const handleRemoveWorldRule = (idx) => {
    setStoryContext(prev => ({
      ...prev,
      worldRules: prev.worldRules.filter((_, i) => i !== idx),
    }));
  };

  const handleAutoExtractCharacters = async () => {
    const allContent = chapters.map(ch => ch.content).join("\n");
    if (!allContent.replace(/<[^>]+>/g, "").trim()) return;

    setAiLoading(true);
    try {
      const res = await API.post("/ai/extract-characters", {
        text: allContent.replace(/<[^>]+>/g, "").substring(0, 5000),
      });
      if (res.data.characters && res.data.characters.length > 0) {
        setStoryContext(prev => ({
          ...prev,
          characters: [
            ...prev.characters,
            ...res.data.characters.filter(
              newC => !prev.characters.some(existC => existC.name.toLowerCase() === newC.name.toLowerCase())
            ),
          ],
        }));
      }
    } catch (err) {
      console.error("Auto-extract characters failed:", err);
    }
    setAiLoading(false);
  };

  // ── Flesh It Out Handler ──
  const handleFleshItOut = async () => {
    const content = chapters[activeChapterIdx]?.content;
    if (!content?.replace(/<[^>]+>/g, "").trim()) return;

    setAiLoading(true);
    setShowAiPanel(true);
    setAiResult("");
    try {
      const res = await API.post("/ai/flesh-it-out", {
        text: content.replace(/<[^>]+>/g, "").substring(Math.max(0, content.length - 2000)),
        genre: genres[0] || "fiction",
        tone,
        ...buildRAGPayload(),
      });
      setAiResult(res.data.result);
    } catch (err) {
      setAiResult("AI service temporarily unavailable.");
    }
    setAiLoading(false);
  };

  // ── Multi-Agent Writer's Room Handler ──
  const handleWritersRoom = async () => {
    if (!writersRoomInput.trim()) return;

    setWritersRoomStep(1); // Interpreting
    setWritersRoomResult({ beats: "", draft: "", final: "" });

    const timer2 = setTimeout(() => setWritersRoomStep(2), 3000);
    const timer3 = setTimeout(() => setWritersRoomStep(3), 7000);

    try {
      const resPromise = API.post("/ai/multi-agent-write", {
        text: writersRoomInput,
        genre: genres[0] || "fiction",
        tone,
        ...buildRAGPayload(),
      });

      const res = await resPromise;
      clearTimeout(timer2);
      clearTimeout(timer3);
      setWritersRoomStep(4);
      setWritersRoomResult({
        beats: res.data.beats,
        draft: res.data.draft,
        final: res.data.final,
      });
    } catch (err) {
      clearTimeout(timer2);
      clearTimeout(timer3);
      setWritersRoomStep(0);
      alert("Writer's Room failed. Please try again.");
    }
  };

  const insertWritersRoomResult = () => {
    if (!writersRoomResult.final) return;
    insertIntoActiveChapter(writersRoomResult.final);
    setShowWritersRoom(false);
    setWritersRoomStep(0);
    setWritersRoomResult({ beats: "", draft: "", final: "" });
    setWritersRoomInput("");
  };

  // ── Generate Variations Handler ──
  const handleGenerateVariations = async () => {
    const content = chapters[activeChapterIdx]?.content;
    if (!content?.replace(/<[^>]+>/g, "").trim()) return;

    setVariationsLoading(true);
    setShowVariations(true);
    setVariations([]);
    setActiveVariation(0);
    try {
      const res = await API.post("/ai/generate-variations", {
        text: content.replace(/<[^>]+>/g, "").substring(Math.max(0, content.length - 1500)),
        genre: genres[0] || "fiction",
        ...buildRAGPayload(),
      });
      setVariations(res.data.variations || []);
    } catch (err) {
      setShowVariations(false);
      alert("Failed to generate variations.");
    }
    setVariationsLoading(false);
  };

  const insertVariation = (idx) => {
    const variation = variations[idx];
    if (!variation) return;
    insertIntoActiveChapter(variation.content);
    setShowVariations(false);
    setVariations([]);
  };

  // ── Narrative Analysis Handler ──
  const handleAnalyzeNarrative = async () => {
    if (chapters.length === 0 || !chapters[0]?.content?.trim()) return;

    setAnalysisLoading(true);
    setShowAnalysis(true);
    setNarrativeAnalysis(null);
    try {
      const res = await API.post("/ai/analyze-narrative", {
        chapters: chapters.map(ch => ({
          title: ch.title,
          content: ch.content,
        })),
        storyContext,
        genre: genres[0] || "fiction",
      });
      setNarrativeAnalysis(res.data.analysis);
    } catch (err) {
      setShowAnalysis(false);
      alert("Failed to analyze narrative.");
    }
    setAnalysisLoading(false);
  };

  // ── Auto-summarize chapter for RAG ──
  const handleSummarizeChapter = async (idx) => {
    const ch = chapters[idx];
    if (!ch?.content?.replace(/<[^>]+>/g, "").trim()) return;

    try {
      const res = await API.post("/ai/summarize-chapter", {
        chapterTitle: ch.title,
        chapterContent: ch.content.replace(/<[^>]+>/g, ""),
      });
      if (res.data.summary) {
        const updated = [...chapters];
        updated[idx] = { ...updated[idx], summary: res.data.summary };
        setChapters(updated);
      }
    } catch (err) {
      console.error("Chapter summarize failed:", err);
    }
  };

  // ── Character Chat Handler ──
  const handleCharacterChat = async () => {
    if (!chatInput.trim() || !chatCharacter) return;

    const userMsg = { role: "user", content: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await API.post("/ai/chat-with-character", {
        characterName: chatCharacter,
        userMessage: chatInput,
        storyContext,
        chatHistory,
      });
      setChatHistory(prev => [...prev, { role: "character", content: res.data.response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "character", content: "The character is unavailable right now..." }]);
    }
    setChatLoading(false);
  };

  const openCharacterChat = (charName) => {
    setChatCharacter(charName);
    setChatHistory([]);
    setChatInput("");
    setShowCharacterChat(true);
  };

  // ── Continuity Audit Handler ──
  const handleAuditChapter = async () => {
    if (!chapters[activeChapterIdx]?.content?.replace(/<[^>]+>/g, "").trim()) return;

    setAuditLoading(true);
    setShowAudit(true);
    setAuditResult(null);

    try {
      const res = await API.post("/ai/audit-chapter", {
        storyContext,
        chapters: chapters.map(ch => ({
          title: ch.title,
          content: ch.content,
          summary: ch.summary || "",
        })),
        chapterIdx: activeChapterIdx,
        genre: genres[0] || "fiction",
      });
      setAuditResult(res.data.audit);
    } catch (err) {
      setAuditResult({ issues: [], score: 0, summary: "Audit failed — AI service unavailable." });
    }
    setAuditLoading(false);
  };

  // ── Location Handler ──
  const handleAddLocation = () => {
    if (!newLocation.name.trim()) return;
    setStoryContext(prev => ({
      ...prev,
      locations: [...(prev.locations || []), {
        name: newLocation.name.trim(),
        description: newLocation.description.trim(),
        sensoryDetails: newLocation.sensoryDetails.trim(),
        significance: newLocation.significance.trim(),
      }],
    }));
    setNewLocation({ name: "", description: "", sensoryDetails: "", significance: "" });
  };

  const handleRemoveLocation = (idx) => {
    setStoryContext(prev => ({
      ...prev,
      locations: (prev.locations || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddFaction = () => {
    if (!newFaction.name.trim()) return;
    setStoryContext(prev => ({
      ...prev,
      factions: [...(prev.factions || []), {
        name: newFaction.name.trim(),
        description: newFaction.description.trim(),
        members: newFaction.members.split(",").map(member => member.trim()).filter(Boolean),
        goals: newFaction.goals.trim(),
      }],
    }));
    setNewFaction({ name: "", description: "", members: "", goals: "" });
  };

  const handleRemoveFaction = (idx) => {
    setStoryContext(prev => ({
      ...prev,
      factions: (prev.factions || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    setStoryContext(prev => ({
      ...prev,
      items: [...(prev.items || []), {
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        owner: newItem.owner.trim(),
        significance: newItem.significance.trim(),
      }],
    }));
    setNewItem({ name: "", description: "", owner: "", significance: "" });
  };

  const handleRemoveItem = (idx) => {
    setStoryContext(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddSnippet = () => {
    if (!newSnippet.label.trim()) return;
    setStoryContext(prev => ({
      ...prev,
      snippets: [...(prev.snippets || []), {
        label: newSnippet.label.trim(),
        content: newSnippet.content.trim(),
        tags: newSnippet.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      }],
    }));
    setNewSnippet({ label: "", content: "", tags: "" });
  };

  const handleRemoveSnippet = (idx) => {
    setStoryContext(prev => ({
      ...prev,
      snippets: (prev.snippets || []).filter((_, i) => i !== idx),
    }));
  };

  const insertIntoActiveChapter = (text) => {
    if (!text) return;
    const editor = quillRef.current?.getEditor?.();
    if (editor) {
      editor.insertText(Math.max(0, editor.getLength() - 1), `\n\n${text}`, "user");
      editor.setSelection(editor.getLength(), 0, "silent");
      return;
    }
    setChapters(current => {
      const next = [...current];
      next[activeChapterIdx] = { ...next[activeChapterIdx], content: `${next[activeChapterIdx].content || ""}\n\n${text}` };
      return next;
    });
  };

  const handleEditorContentChange = value => {
    handleChapterChange("content", value);
    const plain = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    const mention = plain.match(/@([\w\s'’-]{0,40})$/);
    setLoreQuery(mention ? mention[1].trimStart() : null);
  };

  const insertLoreMention = entry => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;
    const range = editor.getSelection(true) || { index: editor.getLength() - 1, length: 0 };
    const queryLength = (loreQuery || "").length + 1;
    editor.deleteText(Math.max(0, range.index - queryLength), queryLength, "user");
    editor.insertText(Math.max(0, range.index - queryLength), entry.label, { background: "#fff0a8", bold: true }, "user");
    editor.insertText(Math.max(0, range.index - queryLength) + entry.label.length, " ", "user");
    setLoreQuery(null);
  };

  const handleBranchChapter = async () => {
    if (!currentPlainText.trim()) return;
    setShowBranches(true);
    setBranchLoading(true);
    setBranches([]);
    try {
      const res = await API.post("/ai/branch-chapter", {
        text: chapters[activeChapterIdx].content,
        divergence: branchPrompt,
        ...buildRAGPayload(),
      });
      setBranches(res.data.branches || []);
    } catch (error) {
      setBranches([]);
    } finally {
      setBranchLoading(false);
    }
  };

  const handleBetaRead = async () => {
    if (!currentPlainText.trim()) return;
    setShowBetaReaders(true);
    setBetaReaders([]);
    setBetaLoading(true);
    try {
      const res = await API.post("/ai/beta-read", {
        text: chapters[activeChapterIdx].content,
        genre: genres[0] || "fiction",
        storyContext,
      });
      setBetaReaders(res.data.readers || []);
    } catch (error) {
      setBetaReaders([]);
    } finally {
      setBetaLoading(false);
    }
  };

  const handleRelationshipMap = async () => {
    setShowRelationships(true);
    setRelationshipData(null);
    setRelationshipLoading(true);
    try {
      const res = await API.post("/ai/analyze-relationships", { chapters, storyContext });
      setRelationshipData(res.data);
    } catch (error) {
      setRelationshipData({ characters: (storyContext.characters || []).map(character => character.name), relationships: [] });
    } finally {
      setRelationshipLoading(false);
    }
  };

  const highlightShowTellFindings = findings => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;
    const editorText = editor.getText();
    findings.forEach(finding => {
      const index = editorText.indexOf(finding.original);
      if (index >= 0) editor.formatText(index, finding.original.length, { background: "#ffe08a" }, "silent");
    });
  };

  const handleShowDontTell = async () => {
    if (!currentPlainText.trim()) return;
    setShowTellPanel(true);
    setShowTellFindings([]);
    setShowTellLoading(true);
    try {
      const res = await API.post("/ai/show-dont-tell", { text: chapters[activeChapterIdx].content, genre: genres[0] || "fiction" });
      const findings = res.data.findings || [];
      setShowTellFindings(findings);
      setTimeout(() => highlightShowTellFindings(findings), 0);
    } catch (error) {
      setShowTellFindings([]);
    } finally {
      setShowTellLoading(false);
    }
  };

  const applyShowTellRewrite = (finding, rewrite) => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;
    const index = editor.getText().indexOf(finding.original);
    if (index >= 0) {
      editor.deleteText(index, finding.original.length, "user");
      editor.insertText(index, rewrite, "user");
      editor.setSelection(index + rewrite.length, 0, "silent");
    } else {
      insertIntoActiveChapter(rewrite);
    }
    setShowTellFindings(current => current.filter(item => item.original !== finding.original));
  };

  const toggleFocusMode = async () => {
    if (focusMode) {
      setFocusMode(false);
      stopSoundscape();
      return;
    }
    setFocusMode(true);
    startSoundscape("rain");
    try {
      const res = await API.post("/ai/detect-soundscape", { text: chapters[activeChapterIdx]?.content || "", tone: tone || storyContext.tone });
      setFocusConfig(res.data);
      startSoundscape(res.data.soundscape);
    } catch (error) {
      setFocusConfig(current => ({ ...current, reason: "Using a neutral rain soundscape." }));
    }
  };

  const wordCount = chapters[activeChapterIdx]?.content?.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length || 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (projectLoading) {
    return <><Topbar /><div className="writeProjectLoading"><FaFeatherAlt /><p>Opening your writing project…</p></div></>;
  }

  return (
    <>
      {!focusMode && <Topbar />}
      <div className={`writePage ${focusMode ? `focusMode focusPalette-${focusConfig.palette}` : ""}`}>
        {focusMode && (
          <div className="focusModeBar">
            <div><FaHeadphones /><span><strong>{focusConfig.mood}</strong><small>{focusConfig.soundscape} soundscape · {focusConfig.reason}</small></span></div>
            <button onClick={() => startSoundscape(focusConfig.soundscape)} title="Restart soundscape"><FaPlay /></button>
            <button onClick={toggleFocusMode}><FaStop /> Exit focus</button>
          </div>
        )}
        <div className="writeContainer">

          {/* Left: Editor */}
          <div className="writeEditor">
            <div className="writeEditorHeader">
              <FaFeatherAlt className="writeHeaderIcon" />
              <h1 className="writeHeaderTitle">{title || "Untitled Story"}</h1>
              <div className="writeHeaderActions">
                {autoSaved && (
                  <span className="autoSaveIndicator">
                    <FaCheckCircle /> Saved
                  </span>
                )}
                {saveError && <span className="writeSaveError" title={saveError}>Cloud save paused</span>}
                <button className="writeQuickLink" onClick={() => navigate("/projects")} title="Open all writing projects">
                  <FaBookOpen /> Projects
                </button>
                <button className="writeQuickLink" onClick={() => navigate(`/canvas?bookId=${bookId}`)} title="Open the visual Story Canvas">
                  <MdAccountTree /> Canvas
                </button>
                <button className="writeQuickLink" onClick={() => navigate(`/planning/${bookId}`)} title="Open the project planning board">
                  <FaColumns /> Planning
                </button>
                <button className="writeQuickLink writeFocusLink" onClick={toggleFocusMode} title="Enter an adaptive immersive writing mode">
                  <FaHeadphones /> Focus
                </button>
              </div>
            </div>

            {/* ─── NEW: Story Context Panel (RAG) ─── */}
            <div className="storyContextSection">
              <button
                className="contextToggleBtn"
                onClick={() => setShowContextPanel(!showContextPanel)}
              >
                <FaBookOpen />
                Story Bible {storyContext.characters.length > 0 && `(${storyContext.characters.length} characters)`}
                <span className="ragBadge">RAG</span>
                <span className={`contextArrow ${showContextPanel ? "open" : ""}`}>▼</span>
              </button>

              {showContextPanel && (
                <div className="contextPanelContent">
                  <p className="contextHelpText">
                    The AI reads this context with every request to maintain consistency across your story.
                  </p>

                  {/* Characters */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <FaUserFriends /> <span>Characters</span>
                      <button className="contextAutoBtn" onClick={handleAutoExtractCharacters} disabled={aiLoading}>
                        <MdAutoAwesome /> Auto-detect
                      </button>
                    </div>
                    <div className="characterChips">
                      {storyContext.characters.map((char, i) => (
                        <div key={i} className="characterChip">
                          <div className="characterChipName">{char.name}</div>
                          {char.description && <div className="characterChipDesc">{char.description}</div>}
                           {char.traits?.length > 0 && (
                             <div className="characterChipTraits">
                               {char.traits.map((t, j) => <span key={j} className="traitTag">{t}</span>)}
                             </div>
                           )}
                           <button className="characterChatBtn" onClick={() => openCharacterChat(char.name)}>
                             <FaComments /> Chat
                           </button>
                           <button className="characterRemoveBtn" onClick={() => handleRemoveCharacter(i)}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="addCharacterForm">
                      <input
                        placeholder="Name"
                        value={newCharacter.name}
                        onChange={e => setNewCharacter({ ...newCharacter, name: e.target.value })}
                        className="contextInput contextInputSmall"
                      />
                      <input
                        placeholder="Description"
                        value={newCharacter.description}
                        onChange={e => setNewCharacter({ ...newCharacter, description: e.target.value })}
                        className="contextInput"
                      />
                      <input
                        placeholder="Traits (comma-separated)"
                        value={newCharacter.traits}
                        onChange={e => setNewCharacter({ ...newCharacter, traits: e.target.value })}
                        className="contextInput"
                      />
                      <button className="contextAddBtn" onClick={handleAddCharacter}>+ Add</button>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <FaMapMarkerAlt /> <span>Locations</span>
                    </div>
                    <div className="codexCardGrid">
                      {(storyContext.locations || []).map((location, i) => (
                        <div key={`${location.name}-${i}`} className="codexCard codexCardLocation">
                          <strong>{location.name}</strong>
                          {location.description && <p>{location.description}</p>}
                          {location.sensoryDetails && <small><b>Sensory:</b> {location.sensoryDetails}</small>}
                          {location.significance && <small><b>Story role:</b> {location.significance}</small>}
                          <button className="codexRemoveBtn" onClick={() => handleRemoveLocation(i)} aria-label={`Remove ${location.name}`}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="codexEntryForm">
                      <input className="contextInput contextInputSmall" placeholder="Location name" value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })} />
                      <input className="contextInput" placeholder="Description" value={newLocation.description} onChange={e => setNewLocation({ ...newLocation, description: e.target.value })} />
                      <input className="contextInput" placeholder="Sensory details" value={newLocation.sensoryDetails} onChange={e => setNewLocation({ ...newLocation, sensoryDetails: e.target.value })} />
                      <input className="contextInput" placeholder="Plot significance" value={newLocation.significance} onChange={e => setNewLocation({ ...newLocation, significance: e.target.value })} />
                      <button className="contextAddBtn" onClick={handleAddLocation}>+ Add</button>
                    </div>
                  </div>

                  {/* Factions */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <FaUserFriends /> <span>Factions</span>
                    </div>
                    <div className="codexCardGrid">
                      {(storyContext.factions || []).map((faction, i) => (
                        <div key={`${faction.name}-${i}`} className="codexCard codexCardFaction">
                          <strong>{faction.name}</strong>
                          {faction.description && <p>{faction.description}</p>}
                          {faction.members?.length > 0 && <small><b>Members:</b> {faction.members.join(", ")}</small>}
                          {faction.goals && <small><b>Goal:</b> {faction.goals}</small>}
                          <button className="codexRemoveBtn" onClick={() => handleRemoveFaction(i)} aria-label={`Remove ${faction.name}`}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="codexEntryForm">
                      <input className="contextInput contextInputSmall" placeholder="Faction name" value={newFaction.name} onChange={e => setNewFaction({ ...newFaction, name: e.target.value })} />
                      <input className="contextInput" placeholder="Description" value={newFaction.description} onChange={e => setNewFaction({ ...newFaction, description: e.target.value })} />
                      <input className="contextInput" placeholder="Members (comma-separated)" value={newFaction.members} onChange={e => setNewFaction({ ...newFaction, members: e.target.value })} />
                      <input className="contextInput" placeholder="Goals" value={newFaction.goals} onChange={e => setNewFaction({ ...newFaction, goals: e.target.value })} />
                      <button className="contextAddBtn" onClick={handleAddFaction}>+ Add</button>
                    </div>
                  </div>

                  {/* Important Items */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <MdExplore /> <span>Important Items</span>
                    </div>
                    <div className="codexCardGrid">
                      {(storyContext.items || []).map((item, i) => (
                        <div key={`${item.name}-${i}`} className="codexCard codexCardItem">
                          <strong>{item.name}</strong>
                          {item.description && <p>{item.description}</p>}
                          {item.owner && <small><b>Owner:</b> {item.owner}</small>}
                          {item.significance && <small><b>Story role:</b> {item.significance}</small>}
                          <button className="codexRemoveBtn" onClick={() => handleRemoveItem(i)} aria-label={`Remove ${item.name}`}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="codexEntryForm">
                      <input className="contextInput contextInputSmall" placeholder="Item name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                      <input className="contextInput" placeholder="Description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                      <input className="contextInput" placeholder="Owner" value={newItem.owner} onChange={e => setNewItem({ ...newItem, owner: e.target.value })} />
                      <input className="contextInput" placeholder="Plot significance" value={newItem.significance} onChange={e => setNewItem({ ...newItem, significance: e.target.value })} />
                      <button className="contextAddBtn" onClick={handleAddItem}>+ Add</button>
                    </div>
                  </div>

                  {/* Lore Snippets */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <FaBookOpen /> <span>Lore Snippets</span>
                    </div>
                    <div className="codexCardGrid">
                      {(storyContext.snippets || []).map((snippet, i) => (
                        <div key={`${snippet.label}-${i}`} className="codexCard codexCardSnippet">
                          <strong>{snippet.label}</strong>
                          {snippet.content && <p>{snippet.content}</p>}
                          {snippet.tags?.length > 0 && (
                            <div className="codexTags">{snippet.tags.map((tag, tagIdx) => <span key={`${tag}-${tagIdx}`}>{tag}</span>)}</div>
                          )}
                          <button className="codexRemoveBtn" onClick={() => handleRemoveSnippet(i)} aria-label={`Remove ${snippet.label}`}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="codexEntryForm codexSnippetForm">
                      <input className="contextInput contextInputSmall" placeholder="Snippet label" value={newSnippet.label} onChange={e => setNewSnippet({ ...newSnippet, label: e.target.value })} />
                      <textarea className="contextInput contextTextarea" placeholder="Lore, research, or a fact the AI should remember" rows={2} value={newSnippet.content} onChange={e => setNewSnippet({ ...newSnippet, content: e.target.value })} />
                      <input className="contextInput" placeholder="Tags (comma-separated)" value={newSnippet.tags} onChange={e => setNewSnippet({ ...newSnippet, tags: e.target.value })} />
                      <button className="contextAddBtn" onClick={handleAddSnippet}>+ Add</button>
                    </div>
                  </div>

                  {/* World Rules */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <FaGlobeAmericas /> <span>World Rules</span>
                    </div>
                    <div className="worldRulesList">
                      {storyContext.worldRules.map((rule, i) => (
                        <div key={i} className="worldRuleChip">
                          <span>{rule}</span>
                          <button onClick={() => handleRemoveWorldRule(i)}>×</button>
                        </div>
                      ))}
                    </div>
                    <div className="addWorldRuleRow">
                      <input
                        placeholder="e.g., Magic costs life energy"
                        value={newWorldRule}
                        onChange={e => setNewWorldRule(e.target.value)}
                        className="contextInput"
                        onKeyDown={e => e.key === "Enter" && handleAddWorldRule()}
                      />
                      <button className="contextAddBtn" onClick={handleAddWorldRule}>+ Add</button>
                    </div>
                  </div>

                  {/* Tone & Style */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <MdBrush /> <span>Tone & Style</span>
                    </div>
                    <input
                      className="contextInput"
                      placeholder="Story tone (e.g., Dark fantasy with dry humor)"
                      value={storyContext.tone}
                      onChange={e => setStoryContext({ ...storyContext, tone: e.target.value })}
                    />
                    <textarea
                      className="contextInput contextTextarea"
                      placeholder="Author style guide (e.g., Write like Brandon Sanderson — detailed magic systems, epic scale, witty dialogue)"
                      value={storyContext.authorStyleGuide}
                      onChange={e => setStoryContext({ ...storyContext, authorStyleGuide: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Plot Summary */}
                  <div className="contextSubSection">
                    <div className="contextSubHeader">
                      <MdAccountTree /> <span>Plot Summary (Running)</span>
                    </div>
                    <textarea
                      className="contextInput contextTextarea"
                      placeholder="Brief summary of what has happened so far in the story..."
                      value={storyContext.plotSummary}
                      onChange={e => setStoryContext({ ...storyContext, plotSummary: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Meta Fields (existing) */}
            <div className="writeMetaSection">
              <input
                className="writeTitleInput"
                placeholder="Your story title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="writeDescRow">
                <textarea
                  className="writeDescInput"
                  placeholder="Write a compelling description..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                />
                <button
                  className="aiDescBtn"
                  onClick={handleGenerateDesc}
                  disabled={aiLoading || !chapters[0]?.content}
                  title="Auto-generate description with AI"
                >
                  <MdAutoFixHigh /> AI
                </button>
              </div>

              <input
                className="writeCoverInput"
                placeholder="Cover image URL (optional)"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
              />

              {/* Genres */}
              <div className="writeGenres">
                <span className="writeGenresLabel">Genres (pick up to 5):</span>
                <div className="writeGenreChips">
                  {GENRE_OPTIONS.map(g => (
                    <button
                      key={g}
                      className={`writeGenreChip ${genres.includes(g) ? 'active' : ''}`}
                      onClick={() => handleGenreToggle(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="writePrivacyRow">
                <label>
                  <input type="radio" name="privacy" value="public" checked={privacy === "public"} onChange={(e) => setPrivacy(e.target.value)} />
                  <span>Public</span>
                </label>
                <label>
                  <input type="radio" name="privacy" value="private" checked={privacy === "private"} onChange={(e) => setPrivacy(e.target.value)} />
                  <span>Private</span>
                </label>
              </div>
            </div>

            {/* Chapter Tabs */}
            <div className="writeChapterTabs">
              {chapters.map((ch, i) => (
                <div
                  key={i}
                  className={`writeChapterTab ${activeChapterIdx === i ? 'active' : ''}`}
                  onClick={() => setActiveChapterIdx(i)}
                >
                  <span>{ch.title || `Ch ${i + 1}`}</span>
                  {ch.summary && <span className="chapterSummaryDot" title="RAG indexed">●</span>}
                  {chapters.length > 1 && (
                    <FaTrash
                      className="chapterDeleteIcon"
                      onClick={(e) => { e.stopPropagation(); handleRemoveChapter(i); }}
                    />
                  )}
                </div>
              ))}
              <button className="addChapterBtn" onClick={handleAddChapter}>
                <FaPlus /> Add
              </button>
            </div>

            {/* Chapter Editor */}
            <div className="writeChapterEditor">
              <div className="chapterEditorHeader">
                <input
                  className="chapterTitleInput"
                  placeholder="Chapter title..."
                  value={chapters[activeChapterIdx]?.title || ""}
                  onChange={(e) => handleChapterChange("title", e.target.value)}
                />
                <button
                  className="summarizeChapterBtn"
                  onClick={() => handleSummarizeChapter(activeChapterIdx)}
                  title="Generate a RAG summary for this chapter (helps the AI remember it)"
                >
                  <MdAutoAwesome /> Index for AI
                </button>
              </div>
              {chapters[activeChapterIdx]?.summary && (
                <div className="chapterSummaryBar">
                  <strong>RAG Summary:</strong> {chapters[activeChapterIdx].summary}
                </div>
              )}
              <ReactQuill
                ref={quillRef}
                theme="snow"
                className="chapterContentInputQuill"
                placeholder="Start writing your story..."
                value={chapters[activeChapterIdx]?.content || ""}
                onChange={handleEditorContentChange}
              />
              <div className="smartLoreBar">
                <div className="smartLoreLabel"><MdAlternateEmail /> Smart Lore</div>
                <span>{detectedLore.length > 0 ? `${detectedLore.length} Codex ${detectedLore.length === 1 ? "entry" : "entries"} linked` : "Type @ to link Story Bible lore"}</span>
                <div className="smartLoreDetected">
                  {detectedLore.slice(0, 6).map(entry => <button key={`${entry.type}-${entry.label}`} title={entry.description || entry.type}>{entry.label}<small>{entry.type}</small></button>)}
                </div>
                {loreQuery !== null && (
                  <div className="smartLoreMenu">
                    {loreEntries.filter(entry => entry.label.toLowerCase().includes(loreQuery.toLowerCase())).slice(0, 7).map(entry => (
                      <button key={`${entry.type}-${entry.label}`} onMouseDown={event => { event.preventDefault(); insertLoreMention(entry); }}>
                        <strong>{entry.label}</strong><span>{entry.type} · {entry.description || "Story Bible entry"}</span>
                      </button>
                    ))}
                    {loreEntries.length === 0 && <p>Add Story Bible entries to use Smart Lore.</p>}
                  </div>
                )}
              </div>
              <div className="writeStats">
                <span>{wordCount} words</span>
                <span>~{readingTime} min read</span>
              </div>
            </div>

            {/* Publish Button */}
            <button className="publishBtn" onClick={handlePublish} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish Story"}
            </button>
          </div>

          {/* Right: AI Assistant Panel */}
          <div className="writeAiSidebar">
            <h3 className="aiSidebarTitle">
              <FaMagic /> AI Assistant
            </h3>
            <p className="aiSidebarDesc">Let AI help you write better. Story Bible context is injected automatically.</p>

            <div className="aiActions">
              {/* ─── NEW: Primary Agentic Actions ─── */}
              <div className="aiActionsGroup">
                <span className="aiGroupLabel">🚀 Advanced AI Agent</span>
                <button
                  className="aiActionBtn aiActionPrimary"
                  onClick={() => setShowWritersRoom(true)}
                  disabled={aiLoading}
                >
                  <MdAutoAwesome style={{ marginRight: '6px' }} />
                  Writer's Room (3-Agent)
                </button>
                <button
                  className="aiActionBtn aiActionHighlight"
                  onClick={handleFleshItOut}
                  disabled={aiLoading}
                >
                  <MdBrush style={{ marginRight: '6px' }} />
                  Flesh It Out
                </button>
                <button
                  className="aiActionBtn aiActionHighlight"
                  onClick={handleGenerateVariations}
                  disabled={aiLoading || variationsLoading}
                >
                  <MdAccountTree style={{ marginRight: '6px' }} />
                  3 Variations
                </button>
                 <button
                   className="aiActionBtn aiActionHighlight"
                   onClick={handleAnalyzeNarrative}
                   disabled={analysisLoading}
                >
                   <FaChartLine style={{ marginRight: '6px' }} />
                   Analyze Pacing
                 </button>
                 <button
                   className="aiActionBtn aiActionHighlight"
                   onClick={handleAuditChapter}
                   disabled={auditLoading || !chapters[activeChapterIdx]?.content?.replace(/<[^>]+>/g, "").trim()}
                 >
                   <FaShieldAlt style={{ marginRight: '6px' }} />
                   {auditLoading ? "Auditing Chapter..." : "Continuity Audit"}
                 </button>
                 <button
                   className="aiActionBtn aiActionHighlight"
                   onClick={() => openCharacterChat(storyContext.characters?.[0]?.name || "")}
                 >
                   <FaComments style={{ marginRight: '6px' }} />
                   Chat with a Character
                 </button>
                 <button className="aiActionBtn aiActionHighlight" onClick={() => setShowBranches(true)} disabled={!currentPlainText.trim()}>
                   <FaCodeBranch style={{ marginRight: '6px' }} /> What If? Timelines
                 </button>
                 <button className="aiActionBtn aiActionHighlight" onClick={handleBetaRead} disabled={betaLoading || !currentPlainText.trim()}>
                   <MdGroups style={{ marginRight: '6px' }} /> Beta Reader Panel
                 </button>
                 <button className="aiActionBtn aiActionHighlight" onClick={handleRelationshipMap} disabled={relationshipLoading || (storyContext.characters || []).length < 2}>
                   <MdHub style={{ marginRight: '6px' }} /> Relationship Web
                 </button>
                 <button className="aiActionBtn aiActionHighlight" onClick={handleShowDontTell} disabled={showTellLoading || !currentPlainText.trim()}>
                   <MdHighlight style={{ marginRight: '6px' }} /> Show, Don't Tell
                 </button>
                 <button className="aiActionBtn aiActionHighlight" onClick={toggleFocusMode}>
                   <FaHeadphones style={{ marginRight: '6px' }} /> Immersive Focus
                 </button>
               </div>

              <div className="aiDivider" />

              {/* ─── EXISTING: Story Generator + Write Assist ─── */}
              <button
                className="aiActionBtn"
                style={{ background: 'var(--button-gradient)', color: 'white', border: 'none', padding: '14px', marginBottom: '5px' }}
                onClick={() => setShowStoryModal(true)}
              >
                <MdAutoFixHigh style={{ marginRight: '8px' }}/>
                Auto-Generate Full Story
              </button>

              <select className="toneSelector" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="">Default Tone</option>
                <option value="dramatic">Dramatic</option>
                <option value="humorous">Humorous</option>
                <option value="romantic">Romantic</option>
                <option value="suspenseful">Suspenseful</option>
                <option value="poetic">Poetic</option>
                <option value="formal">Formal</option>
              </select>

              <button className="aiActionBtn" onClick={() => handleAiAction("continue")} disabled={aiLoading}>
                Continue Story
              </button>
              <button className="aiActionBtn" onClick={() => handleAiAction("improve")} disabled={aiLoading}>
                Improve Writing
              </button>
              <button className="aiActionBtn" onClick={() => handleAiAction("dialogue")} disabled={aiLoading}>
                Generate Dialogue
              </button>
              <button className="aiActionBtn" onClick={() => handleAiAction("describe-scene")} disabled={aiLoading}>
                Describe Scene
              </button>
              <button className="aiActionBtn" onClick={() => handleAiAction("plot-twist")} disabled={aiLoading}>
                Plot Twist!
              </button>
              <button className="aiActionBtn" onClick={() => handleAiSpecial("brainstorm")} disabled={aiLoading}>
                Brainstorm Ideas
              </button>
              <button className="aiActionBtn" onClick={() => handleAiSpecial("outline")} disabled={aiLoading}>
                Create Outline
              </button>
              <button className="aiActionBtn" onClick={() => handleAiSpecial("tone-shift")} disabled={aiLoading || !tone}>
                Tone Shift (requires tone)
              </button>
              <button className="aiActionBtn" onClick={() => handleAiAction("grammar")} disabled={aiLoading}>
                Fix Grammar
              </button>
            </div>

            {/* Existing AI Result Panel */}
            {showAiPanel && (
              <div className="aiResultPanel">
                {aiLoading ? (
                  <div className="aiLoadingPulse">
                    <div className="skeleton" style={{ height: "16px", marginBottom: "8px" }}></div>
                    <div className="skeleton" style={{ height: "16px", width: "80%", marginBottom: "8px" }}></div>
                    <div className="skeleton" style={{ height: "16px", width: "60%" }}></div>
                  </div>
                ) : (
                  <>
                    <p className="aiResultText">{aiResult}</p>
                    <div className="aiResultActions">
                      <button className="aiInsertBtn" onClick={insertAiResult}>Insert into Story</button>
                      <button className="aiDismissBtn" onClick={() => setShowAiPanel(false)}>Dismiss</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── NEW: Variations Panel ─── */}
            {showVariations && (
              <div className="variationsPanel">
                <div className="variationsHeader">
                  <h4>Choose a Variation</h4>
                  <button className="variationsCloseBtn" onClick={() => setShowVariations(false)}>
                    <MdOutlineClose />
                  </button>
                </div>
                {variationsLoading ? (
                  <div className="aiLoadingPulse">
                    <div className="skeleton" style={{ height: "16px", marginBottom: "8px" }}></div>
                    <div className="skeleton" style={{ height: "16px", width: "80%", marginBottom: "8px" }}></div>
                    <div className="skeleton" style={{ height: "16px", width: "60%" }}></div>
                  </div>
                ) : (
                  <>
                    <div className="variationTabs">
                      {variations.map((v, i) => (
                        <button
                          key={i}
                          className={`variationTab ${activeVariation === i ? "active" : ""}`}
                          onClick={() => setActiveVariation(i)}
                        >
                          {v.style}
                        </button>
                      ))}
                    </div>
                    {variations[activeVariation] && (
                      <div className="variationContent">
                        <p>{variations[activeVariation].content}</p>
                        <button className="aiInsertBtn" onClick={() => insertVariation(activeVariation)}>
                          Insert This Version
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ─── NEW: Narrative Analysis Panel ─── */}
             {showAnalysis && (
              <div className="analysisPanel">
                <div className="analysisHeader">
                  <h4><FaChartLine /> Narrative Analysis</h4>
                  <button className="variationsCloseBtn" onClick={() => setShowAnalysis(false)}>
                    <MdOutlineClose />
                  </button>
                </div>
                {analysisLoading ? (
                  <div className="aiLoadingPulse">
                    <div className="skeleton" style={{ height: "16px", marginBottom: "8px" }}></div>
                    <div className="skeleton" style={{ height: "16px", width: "80%" }}></div>
                  </div>
                ) : narrativeAnalysis ? (
                  <div className="analysisContent">
                    <div className="analysisScore">
                      <span className="scoreLabel">Overall Score</span>
                      <span className="scoreValue">{narrativeAnalysis.overallScore}/10</span>
                    </div>

                    {narrativeAnalysis.pacing && (
                      <div className="analysisSub">
                        <h5>Pacing</h5>
                        <p className="analysisText">{narrativeAnalysis.pacing.assessment}</p>
                        <div className="tensionBars">
                          {narrativeAnalysis.pacing.chapterPacing?.map((cp, i) => (
                            <div key={i} className="tensionBarRow">
                              <span className="tensionLabel">Ch {cp.chapter}</span>
                              <div className="tensionBarTrack">
                                <div
                                  className="tensionBarFill"
                                  style={{ width: `${(cp.tension / 10) * 100}%` }}
                                />
                              </div>
                              <span className="tensionTag">{cp.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {narrativeAnalysis.characterArcs?.length > 0 && (
                      <div className="analysisSub">
                        <h5>Character Arcs</h5>
                        <div className="characterArcList">
                          {narrativeAnalysis.characterArcs.map((ca, i) => (
                            <div key={i} className="characterArcItem">
                              <span className="arcName">{ca.name}</span>
                              <span className={`arcStatus arcStatus-${ca.status?.toLowerCase()}`}>{ca.status}</span>
                              <span className="arcNote">{ca.note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="analysisSub">
                      <h5>Strengths</h5>
                      <ul className="analysisList good">{narrativeAnalysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className="analysisSub">
                      <h5>Areas to Improve</h5>
                      <ul className="analysisList warn">{narrativeAnalysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    </div>

                     {narrativeAnalysis.nextChapterSuggestion && (
                       <div className="analysisSuggestion">
                         <strong>💡 Next Chapter Suggestion:</strong>
                         <p>{narrativeAnalysis.nextChapterSuggestion}</p>
                       </div>
                     )}
                   </div>
                 ) : null}
               </div>
             )}

             {/* ─── Continuity Audit Results ─── */}
             {showAudit && (
               <div className="auditPanel">
                 <div className="auditHeader">
                   <h4><FaShieldAlt /> Continuity Audit</h4>
                   <button className="variationsCloseBtn" onClick={() => setShowAudit(false)} aria-label="Close continuity audit">
                     <MdOutlineClose />
                   </button>
                 </div>
                 {auditLoading ? (
                   <div className="aiLoadingPulse">
                     <div className="skeleton" style={{ height: "16px", marginBottom: "8px" }}></div>
                     <div className="skeleton" style={{ height: "16px", width: "80%", marginBottom: "8px" }}></div>
                     <div className="skeleton" style={{ height: "54px" }}></div>
                   </div>
                 ) : auditResult ? (
                   <div className="auditContent">
                     <div className={`auditScore auditScore${auditResult.score >= 8 ? "Good" : auditResult.score >= 5 ? "Warning" : "Critical"}`}>
                       <span>{auditResult.score}/10</span>
                       <small>continuity score</small>
                     </div>
                     <p className="auditSummary">{auditResult.summary}</p>
                     {auditResult.issues?.length > 0 ? (
                       <div className="auditIssues">
                         {auditResult.issues.map((issue, i) => (
                           <article key={`${issue.type}-${i}`} className={`auditIssue auditIssue-${issue.severity || "suggestion"}`}>
                             <div className="auditIssueMeta">
                               <span>{(issue.type || "continuity note").replace(/_/g, " ")}</span>
                               <span className="auditSeverity">{issue.severity || "suggestion"}</span>
                             </div>
                             <p>{issue.description}</p>
                             {issue.quote && <blockquote>“{issue.quote}”</blockquote>}
                             {issue.fix && <div className="auditFix"><strong>Suggested fix</strong>{issue.fix}</div>}
                           </article>
                         ))}
                       </div>
                     ) : (
                       <div className="auditClear"><FaCheckCircle /> No continuity issues found.</div>
                     )}
                     <button className="auditRunAgainBtn" onClick={handleAuditChapter}>Run audit again</button>
                   </div>
                 ) : null}
               </div>
             )}

             {showTellPanel && (
               <div className="showTellPanel">
                 <div className="auditHeader">
                   <h4><MdHighlight /> Show, Don't Tell</h4>
                   <button className="variationsCloseBtn" onClick={() => setShowTellPanel(false)}><MdOutlineClose /></button>
                 </div>
                 {showTellLoading ? <div className="aiLoadingPulse"><div className="skeleton" style={{ height: 70 }} /></div> : (
                   <div className="showTellFindings">
                     {showTellFindings.length > 0 ? showTellFindings.map((finding, index) => (
                       <article className="showTellFinding" key={`${finding.original}-${index}`}>
                         <span>Telling sentence</span>
                         <blockquote>{finding.original}</blockquote>
                         <p>{finding.reason}</p>
                         <strong>Choose a more vivid version</strong>
                         {(finding.rewrites || []).map((rewrite, rewriteIndex) => (
                           <button key={rewriteIndex} onClick={() => applyShowTellRewrite(finding, rewrite)}>{rewrite}</button>
                         ))}
                       </article>
                     )) : <div className="auditClear"><FaCheckCircle /> The chapter is already showing effectively.</div>}
                   </div>
                 )}
               </div>
             )}
           </div>
          </div>
         </div>

       {showBranches && (
         <div className="modalOverlay" onClick={() => !branchLoading && setShowBranches(false)}>
           <div className="modalContent branchModal" onClick={event => event.stopPropagation()}>
             <div className="advancedModalHeader"><div><span>Branching timelines</span><h2><FaCodeBranch /> What If?</h2><p>Explore two choices without sacrificing your current draft.</p></div><button onClick={() => setShowBranches(false)}><MdOutlineClose /></button></div>
             {branches.length === 0 && !branchLoading && (
               <div className="branchPrompt">
                 <label>Where should the story diverge?</label>
                 <textarea className="modalInput" rows={3} value={branchPrompt} onChange={event => setBranchPrompt(event.target.value)} placeholder="e.g., What if Elara trusts the stranger instead of running?" />
                 <button className="modalSubmitBtn" onClick={handleBranchChapter}>Fork this chapter</button>
               </div>
             )}
             {branchLoading && <div className="advancedLoading"><FaCodeBranch /><strong>Splitting the timeline…</strong><span>Two story architects are following different choices.</span></div>}
             {branches.length > 0 && (
               <div className="branchGrid">
                 {branches.map((branch, index) => (
                   <article key={index}>
                     <span>Timeline {index === 0 ? "A" : "B"}</span><h3>{branch.label}</h3>
                     <div className="branchContent">{branch.content}</div>
                     {branch.consequences?.length > 0 && <ul>{branch.consequences.map((item, consequenceIndex) => <li key={consequenceIndex}>{item}</li>)}</ul>}
                     <button onClick={() => { insertIntoActiveChapter(branch.content); setShowBranches(false); }}>Merge into main story</button>
                   </article>
                 ))}
               </div>
             )}
           </div>
         </div>
       )}

       {showBetaReaders && (
         <div className="modalOverlay" onClick={() => !betaLoading && setShowBetaReaders(false)}>
           <div className="modalContent betaReaderModal" onClick={event => event.stopPropagation()}>
             <div className="advancedModalHeader"><div><span>Simulated audience panel</span><h2><MdGroups /> Beta Readers</h2><p>Three different reader instincts, one honest view of your chapter.</p></div><button onClick={() => setShowBetaReaders(false)}><MdOutlineClose /></button></div>
             {betaLoading ? <div className="advancedLoading"><MdGroups /><strong>Your readers are annotating…</strong></div> : (
               <div className="betaReaderGrid">
                 {betaReaders.map((reader, index) => (
                   <article key={`${reader.persona}-${index}`} className={`betaReaderCard betaReader-${index}`}>
                     <header><span>{index === 0 ? "💥" : index === 1 ? "💞" : "🔎"}</span><div><h3>{reader.persona}</h3><small>{reader.score}/10 response</small></div></header>
                     <blockquote>“{reader.verdict}”</blockquote>
                     {reader.loved?.length > 0 && <div><strong>Loved</strong>{reader.loved.map((item, itemIndex) => <p key={itemIndex}>+ {item}</p>)}</div>}
                     {reader.concerns?.length > 0 && <div><strong>Wanted more</strong>{reader.concerns.map((item, itemIndex) => <p key={itemIndex}>– {item}</p>)}</div>}
                     <footer><strong>Try next</strong><p>{reader.suggestion}</p></footer>
                   </article>
                 ))}
               </div>
             )}
           </div>
         </div>
       )}

       {showRelationships && (
         <div className="modalOverlay" onClick={() => !relationshipLoading && setShowRelationships(false)}>
           <div className="modalContent relationshipModal" onClick={event => event.stopPropagation()}>
             <div className="advancedModalHeader"><div><span>AI-updated character dynamics</span><h2><MdHub /> Relationship Web</h2><p>Trust, affection, and tension inferred from your chapters.</p></div><button onClick={() => setShowRelationships(false)}><MdOutlineClose /></button></div>
             {relationshipLoading ? <div className="advancedLoading"><MdHub /><strong>Mapping character dynamics…</strong></div> : relationshipData ? (
               <>
                 <RelationshipWeb data={relationshipData} />
                 <div className="relationshipLegend"><span className="trust">Trust</span><span className="affection">Affection</span><span className="tension">Tension</span><small>T / A / X labels use a 0–10 scale</small></div>
                 <div className="relationshipEvidence">{relationshipData.relationships?.map((relationship, index) => <div key={index}><strong>{relationship.source} → {relationship.target}: {relationship.label}</strong><p>{relationship.evidence}</p></div>)}</div>
               </>
             ) : null}
           </div>
         </div>
       )}

       {/* ─── Character Chat Modal ─── */}
       {showCharacterChat && (
         <div className="modalOverlay" onClick={() => !chatLoading && setShowCharacterChat(false)}>
           <div className="modalContent characterChatModal" onClick={e => e.stopPropagation()}>
             <div className="characterChatHeader">
               <div>
                 <h2 className="modalTitle"><FaComments /> Character Chat</h2>
                 <p>Interview a character using the personality and lore saved in your Story Bible.</p>
               </div>
               <button className="characterChatClose" onClick={() => setShowCharacterChat(false)} aria-label="Close character chat">
                 <MdOutlineClose />
               </button>
             </div>

             {(storyContext.characters || []).length > 0 ? (
               <>
                 <label className="characterSelectLabel" htmlFor="chatCharacter">Speaking with</label>
                 <select
                   id="chatCharacter"
                   className="modalInput characterSelect"
                   value={chatCharacter}
                   onChange={e => {
                     setChatCharacter(e.target.value);
                     setChatHistory([]);
                   }}
                 >
                   <option value="" disabled>Select a character</option>
                   {storyContext.characters.map((character, i) => (
                     <option key={`${character.name}-${i}`} value={character.name}>{character.name}</option>
                   ))}
                 </select>

                 <div ref={chatMessagesRef} className="characterChatMessages" aria-live="polite">
                   {chatHistory.length === 0 ? (
                     <div className="characterChatEmpty">
                       <FaComments />
                       <strong>Start the conversation</strong>
                       <span>Ask about motives, memories, relationships, or what they would do next.</span>
                     </div>
                   ) : chatHistory.map((message, i) => (
                     <div key={`${message.role}-${i}`} className={`chatMessage chatMessage-${message.role}`}>
                       <span className="chatMessageRole">{message.role === "user" ? "You" : chatCharacter}</span>
                       <p>{message.content}</p>
                       {message.role === "character" && <button className="chatInsertBtn" onClick={() => insertIntoActiveChapter(`“${message.content}”`)}>Insert into story</button>}
                     </div>
                   ))}
                   {chatLoading && (
                     <div className="chatMessage chatMessage-character chatTyping">
                       <span></span><span></span><span></span>
                     </div>
                   )}
                 </div>

                 <form className="characterChatComposer" onSubmit={e => { e.preventDefault(); handleCharacterChat(); }}>
                   <textarea
                     className="modalInput"
                     placeholder={chatCharacter ? `Ask ${chatCharacter} something...` : "Select a character first"}
                     value={chatInput}
                     onChange={e => setChatInput(e.target.value)}
                     onKeyDown={e => {
                       if (e.key === "Enter" && !e.shiftKey) {
                         e.preventDefault();
                         handleCharacterChat();
                       }
                     }}
                     rows={2}
                     disabled={!chatCharacter || chatLoading}
                   />
                   <button className="modalSubmitBtn" type="submit" disabled={!chatInput.trim() || !chatCharacter || chatLoading}>
                     {chatLoading ? "Listening..." : "Send"}
                   </button>
                 </form>
               </>
             ) : (
               <div className="characterChatNoCharacters">
                 <FaUserFriends />
                 <h3>Add a character first</h3>
                 <p>Character Chat needs at least one Story Bible character to build a voice and personality.</p>
                 <button onClick={() => { setShowCharacterChat(false); setShowContextPanel(true); }}>Open Story Bible</button>
               </div>
             )}
           </div>
         </div>
       )}

       {/* ─── NEW: Writer's Room Modal ─── */}
      {showWritersRoom && (
        <div className="modalOverlay" onClick={() => writersRoomStep === 0 && setShowWritersRoom(false)}>
          <div className="modalContent" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            {writersRoomStep === 0 ? (
              <>
                <h2 className="modalTitle"><MdAutoAwesome /> Writer's Room</h2>
                <p className="writersRoomDesc">
                  Describe what happens next in your story — in your own words, any way you want.
                  Don't worry about grammar, tone, or style. Three AI agents will transform it into polished prose.
                </p>
                <textarea
                  className="modalInput writersRoomTextarea"
                  placeholder="e.g., so then the hero finds the old letter under the floorboards and realizes the villain is actually his father and he gets really angry and throws it into the fire but then regrets it"
                  value={writersRoomInput}
                  onChange={e => setWritersRoomInput(e.target.value)}
                  rows={5}
                />
                <button className="modalSubmitBtn" onClick={handleWritersRoom} disabled={!writersRoomInput.trim()}>
                  Send to Writer's Room
                </button>
                <button className="modalDismissBtn" onClick={() => setShowWritersRoom(false)}>Cancel</button>
              </>
            ) : writersRoomStep < 4 ? (
              <div className="writersRoomProgress">
                <h2 className="modalTitle"><MdAutoAwesome /> Writer's Room Working...</h2>
                <div className="agentSteps">
                  <div className={`agentStep ${writersRoomStep >= 1 ? "active" : ""} ${writersRoomStep > 1 ? "done" : ""}`}>
                    <div className="agentStepDot" />
                    <div className="agentStepLabel">
                      <strong>Agent 1: Interpreter</strong>
                      <span>Parsing your idea into story beats...</span>
                    </div>
                  </div>
                  <div className={`agentStep ${writersRoomStep >= 2 ? "active" : ""} ${writersRoomStep > 2 ? "done" : ""}`}>
                    <div className="agentStepDot" />
                    <div className="agentStepLabel">
                      <strong>Agent 2: Drafter</strong>
                      <span>Writing rich prose from the beats...</span>
                    </div>
                  </div>
                  <div className={`agentStep ${writersRoomStep >= 3 ? "active" : ""}`}>
                    <div className="agentStepDot" />
                    <div className="agentStepLabel">
                      <strong>Agent 3: Critic</strong>
                      <span>Polishing and refining the draft...</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="writersRoomDone">
                <h2 className="modalTitle"><MdAutoAwesome /> Writer's Room — Complete!</h2>

                <div className="writersRoomSection">
                  <h4 className="writersRoomSectionTitle">📋 Story Beats (Agent 1)</h4>
                  <pre className="writersRoomBeats">{writersRoomResult.beats}</pre>
                </div>

                <div className="writersRoomSection">
                  <h4 className="writersRoomSectionTitle">✨ Final Polished Text (Agent 3)</h4>
                  <div className="writersRoomFinal">{writersRoomResult.final}</div>
                </div>

                <div className="aiResultActions" style={{ marginTop: '16px' }}>
                  <button className="aiInsertBtn" onClick={insertWritersRoomResult}>Insert into Story</button>
                  <button className="aiDismissBtn" onClick={() => { setShowWritersRoom(false); setWritersRoomStep(0); }}>Dismiss</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Generator Modal (existing — unchanged) */}
      {showStoryModal && (
        <div className="modalOverlay" onClick={() => !isGeneratingStory && setShowStoryModal(false)}>
          <div className="modalContent" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            {isGeneratingStory ? (
              <div className="generatingState">
                <div className="spinner" style={{ margin: '0 auto 20px', width: '40px', height: '40px', border: '4px solid var(--border-light)', borderTop: '4px solid var(--accent-pink)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h2 style={{ textAlign: 'center' }}>Writing your masterpiece...</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>This may take 2-3 minutes for long stories. Do not close this window.</p>
              </div>
            ) : (
              <>
                <h2 className="modalTitle"><MdAutoFixHigh /> Generate Story Wizard</h2>
                <form className="modalForm" onSubmit={handleGenerateStory}>
                  <div className="formGroup">
                    <label>Story Prompt</label>
                    <textarea
                      placeholder="e.g. A cyberpunk detective investigates a rogue AI in Neo Tokyo..."
                      rows={4}
                      value={storyForm.prompt}
                      onChange={(e) => setStoryForm({ ...storyForm, prompt: e.target.value })}
                      className="modalInput"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="formGroup" style={{ flex: 1 }}>
                      <label>Chapters</label>
                      <input
                        type="number" min={1} max={10}
                        value={storyForm.chaptersCount}
                        onChange={(e) => setStoryForm({ ...storyForm, chaptersCount: Number(e.target.value) })}
                        className="modalInput"
                      />
                    </div>
                    <div className="formGroup" style={{ flex: 1 }}>
                      <label>Words per Chapter</label>
                      <input
                        type="number" step={100} min={100} max={2000}
                        value={storyForm.wordLimit}
                        onChange={(e) => setStoryForm({ ...storyForm, wordLimit: Number(e.target.value) })}
                        className="modalInput"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="formGroup" style={{ flex: 1 }}>
                      <label>Language</label>
                      <select
                        value={storyForm.language}
                        onChange={(e) => setStoryForm({ ...storyForm, language: e.target.value })}
                        className="modalInput"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="Japanese">Japanese</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                    <div className="formGroup" style={{ flex: 1 }}>
                      <label>Tone</label>
                      <select
                        value={storyForm.tone}
                        onChange={(e) => setStoryForm({ ...storyForm, tone: e.target.value })}
                        className="modalInput"
                      >
                        <option value="Creative">Creative</option>
                        <option value="Dark & Gritty">Dark & Gritty</option>
                        <option value="Lighthearted">Lighthearted</option>
                        <option value="Epic Fantasy">Epic Fantasy</option>
                        <option value="Romantic">Romantic</option>
                        <option value="Sci-Fi Technical">Sci-Fi Technical</option>
                      </select>
                    </div>
                  </div>
                  <div className="formGroup" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="mediaCheck"
                      checked={storyForm.includeMedia}
                      onChange={(e) => setStoryForm({ ...storyForm, includeMedia: e.target.checked })}
                    />
                    <label htmlFor="mediaCheck" style={{ margin: 0 }}>Include generated media placeholders</label>
                  </div>
                  <button type="submit" className="modalSubmitBtn" style={{ marginTop: '15px' }}>Generate Story</button>
                  <button type="button" className="modalDismissBtn" onClick={() => setShowStoryModal(false)}>Cancel</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
