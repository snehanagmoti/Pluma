import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBookOpen, FaPlus, FaPen, FaTrash, FaColumns } from "react-icons/fa";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import API from "../../config/axios";
import "./Projects.css";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = async () => {
    try {
      const response = await API.get("/books/mine");
      setProjects(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load your writing projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const createProject = async () => {
    setCreating(true);
    setError("");
    try {
      const response = await API.post("/books", { title: "Untitled story", status: "draft", asDraft: true, privacy: "private" });
      navigate(`/write/${response.data._id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not create a new project.");
      setCreating(false);
    }
  };

  const deleteProject = async project => {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return;
    try {
      await API.delete(`/books/${project._id}`);
      setProjects(current => current.filter(item => item._id !== project._id));
      localStorage.removeItem(`pluma_draft_${project._id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete that project.");
    }
  };

  return <>
    <Topbar />
    <div className="projectsPage">
      <Sidebar />
      <main className="projectsMain">
        <header className="projectsHero">
          <div><span>Your studio</span><h1>Writing Projects</h1><p>Every novel, serial, and experiment gets its own chapters, Story Bible, canvas, and planning board.</p></div>
          <button onClick={createProject} disabled={creating}><FaPlus /> {creating ? "Creating…" : "Create new"}</button>
        </header>
        {error && <div className="projectsError">{error}</div>}
        {loading ? <div className="projectsState">Loading your studio…</div> : projects.length ? (
          <section className="projectsGrid">
            {projects.map(project => <article className="projectCard" key={project._id}>
              <div className="projectCover">{project.cover ? <img src={project.cover} alt="" /> : <FaBookOpen />}</div>
              <div className="projectBody">
                <div className="projectMeta"><span className={`projectStatus projectStatus-${project.status || "draft"}`}>{project.status || (project.privacy === "public" ? "published" : "draft")}</span><time>{new Date(project.updatedAt).toLocaleDateString()}</time></div>
                <h2>{project.title || "Untitled story"}</h2>
                <p>{project.desc || "A blank page ready for its first unforgettable line."}</p>
                <small>{project.chapters?.length || 1} {(project.chapters?.length || 1) === 1 ? "chapter" : "chapters"}</small>
                <div className="projectActions">
                  <button onClick={() => navigate(`/write/${project._id}`)}><FaPen /> Write</button>
                  <button onClick={() => navigate(`/planning/${project._id}`)}><FaColumns /> Plan</button>
                  <button className="projectDelete" onClick={() => deleteProject(project)} aria-label={`Delete ${project.title}`}><FaTrash /></button>
                </div>
              </div>
            </article>)}
          </section>
        ) : <div className="projectsState projectsEmpty"><FaBookOpen /><h2>Your next world starts here</h2><p>Create a project, then move freely between drafting, planning, and visual brainstorming.</p><button onClick={createProject}><FaPlus /> Create your first book</button></div>}
      </main>
    </div>
  </>;
}
