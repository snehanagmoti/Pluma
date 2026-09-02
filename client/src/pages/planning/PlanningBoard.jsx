import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaArrowLeft, FaFeatherAlt, FaGripVertical, FaPlus, FaTrash } from "react-icons/fa";
import { MdAccountTree, MdCheckCircle, MdEditNote, MdLightbulbOutline } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import API from "../../config/axios";
import "./PlanningBoard.css";

const COLUMNS = [
  { id: "ideas", title: "Ideas", subtitle: "Loose sparks and possibilities", accent: "#8b5cf6", icon: MdLightbulbOutline },
  { id: "toDraft", title: "To Draft", subtitle: "Ready to become scenes", accent: "#3b82f6", icon: FaFeatherAlt },
  { id: "drafting", title: "Drafting", subtitle: "Actively being written", accent: "#f59e0b", icon: MdEditNote },
  { id: "editing", title: "Editing", subtitle: "Revising and strengthening", accent: "#dd2476", icon: MdAccountTree },
  { id: "done", title: "Done", subtitle: "Finished story work", accent: "#10b981", icon: MdCheckCircle },
];

const EMPTY_BOARD = COLUMNS.reduce((board, column) => ({ ...board, [column.id]: [] }), {});
const EMPTY_DRAFT_TITLES = COLUMNS.reduce((drafts, column) => ({ ...drafts, [column.id]: "" }), {});

const normalizeBoard = board => COLUMNS.reduce((normalized, column) => ({
  ...normalized,
  [column.id]: Array.isArray(board?.[column.id]) ? board[column.id] : [],
}), {});

function SortableCard({ card, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  return (
    <article
      ref={setNodeRef}
      className={`planningCard ${isDragging ? "isDragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="planningCardHandle"
        type="button"
        aria-label={`Drag ${card.title}`}
        {...attributes}
        {...listeners}
      >
        <FaGripVertical />
      </button>
      <p>{card.title}</p>
      <button
        className="planningCardDelete"
        type="button"
        onClick={() => onRemove(card.id)}
        aria-label={`Delete ${card.title}`}
      >
        <FaTrash />
      </button>
    </article>
  );
}

function PlanningColumn({ column, cards, draftTitle, onDraftChange, onAddCard, onRemoveCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const ColumnIcon = column.icon;

  return (
    <section className="planningColumn" style={{ "--column-accent": column.accent }}>
      <header className="planningColumnHeader">
        <div className="planningColumnTitleRow">
          <span className="planningColumnIcon"><ColumnIcon /></span>
          <h2>{column.title}</h2>
          <span className="planningColumnCount">{cards.length}</span>
        </div>
        <p>{column.subtitle}</p>
      </header>

      <div ref={setNodeRef} className={`planningCardList ${isOver ? "isOver" : ""}`}>
        <SortableContext items={cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <SortableCard key={card.id} card={card} onRemove={onRemoveCard} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="planningEmptyColumn">Drop a card here</div>
        )}
      </div>

      <form className="planningAddCard" onSubmit={event => onAddCard(event, column.id)}>
        <input
          value={draftTitle}
          onChange={event => onDraftChange(column.id, event.target.value)}
          placeholder="Add a story task..."
          aria-label={`Add a card to ${column.title}`}
        />
        <button type="submit" disabled={!draftTitle.trim()} aria-label={`Add card to ${column.title}`}>
          <FaPlus />
        </button>
      </form>
    </section>
  );
}

export default function PlanningBoard() {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [draftTitles, setDraftTitles] = useState(EMPTY_DRAFT_TITLES);
  const [activeCardId, setActiveCardId] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(bookId || "");
  const [boardReadyFor, setBoardReadyFor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await API.get("/books/mine");
        const projects = res.data || [];
        setBooks(projects);
        const requestedBook = projects.find(project => project._id === bookId);
        const nextBookId = requestedBook?._id || projects[0]?._id || "";
        setSelectedBookId(nextBookId);
        if (nextBookId && nextBookId !== bookId) navigate(`/planning/${nextBookId}`, { replace: true });
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Could not load your writing projects.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [bookId, navigate]);

  useEffect(() => {
    if (!selectedBookId) {
      setBoard(EMPTY_BOARD);
      setBoardReadyFor("");
      return;
    }
    const fetchBoard = async () => {
      setLoading(true);
      setBoardReadyFor("");
      setError("");
      try {
        const res = await API.get(`/books/${selectedBookId}/planning`);
        setBoard(normalizeBoard(res.data.planningBoard));
        setBoardReadyFor(selectedBookId);
        setSaveStatus("saved");
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Could not load this planning board.");
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [selectedBookId]);

  useEffect(() => {
    if (!selectedBookId || boardReadyFor !== selectedBookId) return undefined;
    setSaveStatus("saving");
    const saveTimer = setTimeout(async () => {
      try {
        await API.put(`/books/${selectedBookId}/planning`, { planningBoard: board });
        setSaveStatus("saved");
      } catch (requestError) {
        setSaveStatus("error");
      }
    }, 600);
    return () => clearTimeout(saveTimer);
  }, [board, boardReadyFor, selectedBookId]);

  const totalCards = useMemo(
    () => COLUMNS.reduce((total, column) => total + (board[column.id]?.length || 0), 0),
    [board]
  );

  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    return COLUMNS.flatMap(column => board[column.id]).find(card => card.id === activeCardId) || null;
  }, [activeCardId, board]);

  const findColumn = (id, currentBoard = board) => {
    if (COLUMNS.some(column => column.id === id)) return id;
    return COLUMNS.find(column => currentBoard[column.id].some(card => card.id === id))?.id;
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveCardId(null);
    if (!over) return;

    const sourceColumnId = findColumn(active.id);
    const destinationColumnId = findColumn(over.id);
    if (!sourceColumnId || !destinationColumnId) return;

    setBoard(currentBoard => {
      const sourceCards = currentBoard[sourceColumnId];
      const destinationCards = currentBoard[destinationColumnId];
      const sourceIndex = sourceCards.findIndex(card => card.id === active.id);
      if (sourceIndex < 0) return currentBoard;

      if (sourceColumnId === destinationColumnId) {
        const overIndex = destinationCards.findIndex(card => card.id === over.id);
        const destinationIndex = overIndex >= 0 ? overIndex : destinationCards.length - 1;
        if (sourceIndex === destinationIndex) return currentBoard;
        return {
          ...currentBoard,
          [sourceColumnId]: arrayMove(sourceCards, sourceIndex, destinationIndex),
        };
      }

      const movedCard = sourceCards[sourceIndex];
      const overIndex = destinationCards.findIndex(card => card.id === over.id);
      const destinationIndex = overIndex >= 0 ? overIndex : destinationCards.length;
      const nextDestination = [...destinationCards];
      nextDestination.splice(destinationIndex, 0, movedCard);

      return {
        ...currentBoard,
        [sourceColumnId]: sourceCards.filter(card => card.id !== active.id),
        [destinationColumnId]: nextDestination,
      };
    });
  };

  const handleAddCard = (event, columnId) => {
    event.preventDefault();
    const title = (draftTitles[columnId] || "").trim();
    if (!title) return;

    const card = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
    };
    setBoard(currentBoard => ({
      ...currentBoard,
      [columnId]: [...currentBoard[columnId], card],
    }));
    setDraftTitles(current => ({ ...current, [columnId]: "" }));
  };

  const handleRemoveCard = cardId => {
    const columnId = findColumn(cardId);
    if (!columnId) return;
    setBoard(currentBoard => ({
      ...currentBoard,
      [columnId]: currentBoard[columnId].filter(card => card.id !== cardId),
    }));
  };

  const handleProjectChange = event => {
    const nextBookId = event.target.value;
    setSelectedBookId(nextBookId);
    navigate(`/planning/${nextBookId}`);
  };

  return (
    <>
      <Topbar />
      <main className="planningPage">
        <header className="planningHeader">
          <div className="planningHeaderMain">
            <span className="planningEyebrow">Story workspace</span>
            <h1>Planning Board</h1>
            <p>Move scenes, chapters, and revision tasks through your writing workflow.</p>
          </div>
          <div className="planningHeaderActions">
            {books.length > 0 && (
              <select className="planningProjectSelect" value={selectedBookId} onChange={handleProjectChange} aria-label="Choose a book project">
                {books.map(book => <option key={book._id} value={book._id}>{book.title}</option>)}
              </select>
            )}
            <span className={`planningSaveStatus planningSaveStatus-${saveStatus}`}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved to project"}
            </span>
            <span className="planningTotal">{totalCards} {totalCards === 1 ? "card" : "cards"}</span>
            <button onClick={() => navigate(selectedBookId ? `/write/${selectedBookId}` : "/projects")}><FaArrowLeft /> Write</button>
            <button onClick={() => navigate("/canvas")}><MdAccountTree /> Canvas</button>
          </div>
        </header>

        {loading ? (
          <div className="planningStateCard">Loading your project board…</div>
        ) : error ? (
          <div className="planningStateCard planningStateError">{error}</div>
        ) : books.length === 0 ? (
          <div className="planningStateCard">
            <MdEditNote />
            <h2>Create a story project first</h2>
            <p>Planning boards are now securely saved per book, so your ideas stay separate and follow you across devices.</p>
            <button onClick={() => navigate("/projects")}>Start a story</button>
          </div>
        ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveCardId(active.id)}
          onDragCancel={() => setActiveCardId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="planningBoard" aria-label="Story planning board">
            {COLUMNS.map(column => (
              <PlanningColumn
                key={column.id}
                column={column}
                cards={board[column.id]}
                draftTitle={draftTitles[column.id] || ""}
                onDraftChange={(columnId, value) => setDraftTitles(current => ({ ...current, [columnId]: value }))}
                onAddCard={handleAddCard}
                onRemoveCard={handleRemoveCard}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <article className="planningCard planningCardOverlay">
                <span className="planningCardHandle"><FaGripVertical /></span>
                <p>{activeCard.title}</p>
              </article>
            ) : null}
          </DragOverlay>
        </DndContext>
        )}
      </main>
    </>
  );
}
