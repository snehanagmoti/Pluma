import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft, FaPaperPlane, FaSearch } from "react-icons/fa";
import { MdAddComment, MdClose, MdForum, MdMoreHoriz } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import API from "../../config/axios";
import "./Messages.css";

const avatarFor = user => user?.avatar || user?.profilePicture;

export default function Messages() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [people, setPeople] = useState([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    const res = await API.get("/messages/conversations");
    setConversations(res.data || []);
    return res.data || [];
  };

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchConversations();
        if (!conversationId && list[0]?._id) navigate(`/messages/${list[0]._id}`, { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
    const poll = setInterval(fetchConversations, 15000);
    return () => clearInterval(poll);
  }, [conversationId, navigate]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return undefined;
    }
    const fetchMessages = async () => {
      const res = await API.get(`/messages/conversations/${conversationId}/messages`);
      setMessages(res.data || []);
      fetchConversations();
    };
    fetchMessages();
    const poll = setInterval(fetchMessages, 8000);
    return () => clearInterval(poll);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showPeople) return;
    const timer = setTimeout(() => {
      API.get("/users/search", { params: { q: peopleQuery } })
        .then(res => setPeople(res.data || []))
        .catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [peopleQuery, showPeople]);

  const selectedConversation = conversations.find(item => item._id === conversationId);
  const activePerson = useMemo(
    () => selectedConversation?.participants?.find(person => person._id !== currentUser?._id),
    [currentUser?._id, selectedConversation]
  );

  const otherParticipant = conversation => conversation.participants?.find(person => person._id !== currentUser?._id);

  const startConversation = async person => {
    const res = await API.post("/messages/conversations", { recipientId: person._id });
    setShowPeople(false);
    setPeopleQuery("");
    await fetchConversations();
    navigate(`/messages/${res.data._id}`);
  };

  const sendMessage = async event => {
    event.preventDefault();
    if (!messageText.trim() || !conversationId || sending) return;
    const outgoing = messageText.trim();
    setMessageText("");
    setSending(true);
    try {
      const res = await API.post(`/messages/conversations/${conversationId}/messages`, { text: outgoing });
      setMessages(current => [...current, res.data]);
      fetchConversations();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Topbar />
      <div className="messagesPage">
        <Sidebar />
        <main className="messagesShell">
          <aside className={`messagesInbox ${conversationId ? "hasActiveConversation" : ""}`}>
            <header className="messagesInboxHeader">
              <div><span>Private conversations</span><h1>Messages</h1></div>
              <button onClick={() => setShowPeople(true)} aria-label="Start a new message"><MdAddComment /></button>
            </header>
            <div className="messagesConversationList">
              {loading ? <div className="messagesLoading">Loading conversations…</div> : conversations.length > 0 ? conversations.map(conversation => {
                const person = otherParticipant(conversation);
                const avatar = avatarFor(person);
                const unread = conversation.unreadBy?.some(id => (id._id || id).toString() === currentUser?._id);
                return (
                  <button key={conversation._id} className={`messagesConversation ${conversation._id === conversationId ? "active" : ""}`} onClick={() => navigate(`/messages/${conversation._id}`)}>
                    <div className="messagesAvatar">{avatar ? <img src={avatar} alt="" /> : (person?.username || "R").charAt(0).toUpperCase()}</div>
                    <span><strong>{person?.username || "Reader"}</strong><small>{conversation.lastMessage || "Start the conversation"}</small></span>
                    {unread && <i />}
                  </button>
                );
              }) : (
                <div className="messagesEmptyInbox"><MdForum /><strong>No messages yet</strong><p>Find a reader or writer and say hello.</p><button onClick={() => setShowPeople(true)}>New message</button></div>
              )}
            </div>
          </aside>

          <section className={`messagesThread ${conversationId ? "active" : ""}`}>
            {conversationId && activePerson ? (
              <>
                <header className="messagesThreadHeader">
                  <button className="messagesBack" onClick={() => navigate("/messages")}><FaArrowLeft /></button>
                  <div className="messagesAvatar">{avatarFor(activePerson) ? <img src={avatarFor(activePerson)} alt="" /> : activePerson.username.charAt(0).toUpperCase()}</div>
                  <div><strong>{activePerson.username}</strong><span>Pluma private message</span></div>
                  <button className="messagesThreadMore"><MdMoreHoriz /></button>
                </header>
                <div className="messagesThreadBody">
                  <div className="messagesThreadWelcome">
                    <div className="messagesAvatar messagesAvatarLarge">{avatarFor(activePerson) ? <img src={avatarFor(activePerson)} alt="" /> : activePerson.username.charAt(0).toUpperCase()}</div>
                    <h2>{activePerson.username}</h2>
                    <p>This is the beginning of your private conversation.</p>
                  </div>
                  {messages.map(message => {
                    const mine = message.sender?._id === currentUser?._id;
                    return (
                      <div key={message._id} className={`messageBubbleRow ${mine ? "mine" : "theirs"}`}>
                        <div className="messageBubble">
                          <p>{message.text}</p>
                          <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form className="messagesComposer" onSubmit={sendMessage}>
                  <textarea value={messageText} onChange={event => setMessageText(event.target.value)} onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(event); }
                  }} placeholder={`Message ${activePerson.username}…`} rows={2} maxLength={2000} />
                  <button type="submit" disabled={!messageText.trim() || sending}><FaPaperPlane /></button>
                </form>
              </>
            ) : (
              <div className="messagesNoThread"><MdForum /><h2>Your story has company.</h2><p>Select a conversation or start a new one.</p></div>
            )}
          </section>
        </main>
      </div>

      {showPeople && (
        <div className="messagePeopleOverlay" onClick={() => setShowPeople(false)}>
          <div className="messagePeopleModal" onClick={event => event.stopPropagation()}>
            <header><div><span>New conversation</span><h2>Message a reader</h2></div><button onClick={() => setShowPeople(false)}><MdClose /></button></header>
            <label><FaSearch /><input autoFocus value={peopleQuery} onChange={event => setPeopleQuery(event.target.value)} placeholder="Search by username…" /></label>
            <div className="messagePeopleList">
              {people.map(person => (
                <button key={person._id} onClick={() => startConversation(person)}>
                  <div className="messagesAvatar">{avatarFor(person) ? <img src={avatarFor(person)} alt="" /> : person.username.charAt(0).toUpperCase()}</div>
                  <span><strong>{person.username}</strong><small>{person.bio || "Reader & writer on Pluma"}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
