import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./StoryCanvas.css";
import Topbar from "../../components/topbar/Topbar";
import API from "../../config/axios";
import { FaPlus, FaRobot, FaTrash, FaSave, FaArrowLeft, FaColumns, FaFeatherAlt } from "react-icons/fa";
import { MdAutoAwesome, MdPerson, MdPlace, MdTimeline, MdOutlineClose } from "react-icons/md";
import { useNavigate, useSearchParams } from "react-router-dom";

const NODE_COLORS = {
  plot: { bg: "linear-gradient(135deg, #6c63ff, #a855f7)", border: "#6c63ff" },
  character: { bg: "linear-gradient(135deg, #dd2476, #ff512f)", border: "#dd2476" },
  location: { bg: "linear-gradient(135deg, #10b981, #059669)", border: "#10b981" },
  event: { bg: "linear-gradient(135deg, #f59e0b, #d97706)", border: "#f59e0b" },
  idea: { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "#3b82f6" },
  ai: { bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)", border: "#8b5cf6" },
};

const initialNodes = [
  {
    id: "1",
    position: { x: 250, y: 200 },
    data: { label: "Your Story Begins", content: "Start brainstorming by adding nodes", type: "plot" },
    type: "default",
    style: {
      background: "linear-gradient(135deg, #6c63ff, #a855f7)",
      color: "white",
      border: "2px solid #6c63ff",
      borderRadius: "12px",
      padding: "16px 20px",
      fontSize: "14px",
      fontWeight: "600",
      minWidth: "180px",
      boxShadow: "0 4px 15px rgba(108, 99, 255, 0.3)",
    },
  },
];

export default function StoryCanvas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newNode, setNewNode] = useState({ label: "", content: "", type: "plot" });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [weavingScene, setWeavingScene] = useState(false);
  const [showNodeDetail, setShowNodeDetail] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(searchParams.get("bookId") || "");
  const [saveStatus, setSaveStatus] = useState("saved");
  const nodeIdCounter = useRef(2);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#6c63ff", strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  );

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
    setShowNodeDetail(true);
  }, []);

  const createStyledNode = useCallback((id, label, content, type, position) => {
    const colors = NODE_COLORS[type] || NODE_COLORS.plot;
    return {
      id,
      position,
      data: { label, content, type },
      type: "default",
      style: {
        background: colors.bg,
        color: "white",
        border: `2px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "16px 20px",
        fontSize: "14px",
        fontWeight: "600",
        minWidth: "180px",
        boxShadow: `0 4px 15px ${colors.border}40`,
      },
    };
  }, []);

  const handleAddNode = () => {
    if (!newNode.label.trim()) return;
    const id = String(nodeIdCounter.current++);
    const position = {
      x: 100 + Math.random() * 500,
      y: 100 + Math.random() * 400,
    };
    const node = createStyledNode(id, newNode.label, newNode.content, newNode.type, position);
    setNodes((prev) => [...prev, node]);
    setNewNode({ label: "", content: "", type: "plot" });
    setShowAddPanel(false);
  };

  const handleDeleteNode = (nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setShowNodeDetail(false);
    setSelectedNode(null);
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    try {
      const connectedNodes = nodes.map((n) => ({
        type: n.data.type,
        label: n.data.label,
        data: n.data.content,
      }));

      const res = await API.post("/ai/generate-canvas-node", {
        nodeType: "plot",
        context: "Generate a plot point that connects existing story elements",
        connectedNodes,
        genre: "fiction",
      });

      if (res.data.node) {
        const id = String(nodeIdCounter.current++);
        const position = {
          x: 200 + Math.random() * 400,
          y: 150 + Math.random() * 300,
        };
        const node = createStyledNode(
          id,
          res.data.node.label,
          res.data.node.content,
          res.data.node.type || "ai",
          position
        );
        setNodes((prev) => [...prev, node]);
      }
    } catch (err) {
      console.error("AI canvas generation failed:", err);
    }
    setAiGenerating(false);
  };

  const handleSaveCanvas = async () => {
    if (!selectedBookId) return navigate("/projects");
    setSaveStatus("saving");
    const storyCanvas = { nodes, edges };
    localStorage.setItem(`pluma_canvas_${selectedBookId}`, JSON.stringify(storyCanvas));
    try {
      await API.put(`/books/${selectedBookId}/canvas`, { storyCanvas });
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
    }
  };

  const handleWeaveScene = async () => {
    if (nodes.length < 2 || edges.length === 0) return;
    setWeavingScene(true);
    try {
      const nodePayload = nodes.map(node => ({
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        content: node.data.content,
      }));
      const labelById = Object.fromEntries(nodes.map(node => [node.id, node.data.label]));
      const edgePayload = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceLabel: labelById[edge.source],
        targetLabel: labelById[edge.target],
      }));
      const res = await API.post("/ai/weave-scene", {
        nodes: nodePayload,
        edges: edgePayload,
        genre: "fiction",
        tone: "cinematic and character-driven",
      });
      sessionStorage.setItem(`pluma_woven_scene_${selectedBookId}`, res.data.content);
      navigate(`/write/${selectedBookId}`);
    } catch (error) {
      alert(error.response?.data?.message || "The scene could not be woven. Try connecting a few more nodes.");
    } finally {
      setWeavingScene(false);
    }
  };

  useEffect(() => {
    API.get("/books/mine").then(response => {
      const nextProjects = response.data || [];
      setProjects(nextProjects);
      const requested = nextProjects.some(project => project._id === selectedBookId) ? selectedBookId : nextProjects[0]?._id || "";
      setSelectedBookId(requested);
      if (requested) setSearchParams({ bookId: requested }, { replace: true });
    }).catch(() => undefined);
  }, [selectedBookId, setSearchParams]);

  useEffect(() => {
    if (!selectedBookId) return undefined;
    let active = true;
    setSaveStatus("loading");
    API.get(`/books/${selectedBookId}/canvas`).then(response => {
      if (!active) return;
      const data = response.data.storyCanvas || {};
      const loadedNodes = (data.nodes || []).map(node => createStyledNode(node.id, node.data.label, node.data.content, node.data.type, node.position));
      const loadedEdges = (data.edges || []).map(edge => ({ ...edge, animated: true, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#6c63ff", strokeWidth: 2 } }));
      setNodes(loadedNodes.length ? loadedNodes : initialNodes);
      setEdges(loadedEdges);
      nodeIdCounter.current = Math.max(1, ...(loadedNodes || []).map(node => Number.parseInt(node.id, 10) || 0)) + 1;
      setSaveStatus("saved");
    }).catch(() => {
      const saved = localStorage.getItem(`pluma_canvas_${selectedBookId}`);
      if (!saved || !active) { setSaveStatus("error"); return; }
      try {
        const data = JSON.parse(saved);
        if (data.nodes?.length) setNodes(data.nodes);
        if (data.edges?.length) setEdges(data.edges);
        nodeIdCounter.current = Math.max(...data.nodes.map((n) => parseInt(n.id) || 0)) + 1;
        setSaveStatus("error");
      } catch (e) {}
    });
    return () => { active = false; };
  }, [createStyledNode, selectedBookId]);

  return (
    <>
      <Topbar />
      <div className="canvasPage">
        {/* Toolbar */}
        <div className="canvasToolbar">
          <button className="canvasToolBtn canvasBackBtn" onClick={() => navigate(selectedBookId ? `/write/${selectedBookId}` : "/projects")}>
            <FaArrowLeft /> Back to Write
          </button>
          <div className="canvasToolbarCenter">
            <h2 className="canvasTitle">
              <MdAutoAwesome /> Story Canvas
            </h2>
          </div>
          <div className="canvasToolbarActions">
            {projects.length > 0 && <select value={selectedBookId} onChange={event => { setSelectedBookId(event.target.value); setSearchParams({ bookId: event.target.value }); }} aria-label="Choose writing project">{projects.map(project => <option value={project._id} key={project._id}>{project.title}</option>)}</select>}
            <span className={`canvasSaveState canvasSaveState-${saveStatus}`}>{saveStatus === "saving" ? "Saving…" : saveStatus === "loading" ? "Loading…" : saveStatus === "error" ? "Browser backup" : "Saved"}</span>
            <button className="canvasToolBtn" onClick={() => navigate(selectedBookId ? `/planning/${selectedBookId}` : "/projects")}>
              <FaColumns /> Planning
            </button>
            <button
              className="canvasToolBtn canvasAddBtn"
              onClick={() => setShowAddPanel(true)}
            >
              <FaPlus /> Add Node
            </button>
            <button
              className="canvasToolBtn canvasAiBtn"
              onClick={handleAIGenerate}
              disabled={aiGenerating}
            >
              <FaRobot /> {aiGenerating ? "Generating..." : "AI Suggest"}
            </button>
            <button className="canvasToolBtn canvasWeaveBtn" onClick={handleWeaveScene} disabled={weavingScene || nodes.length < 2 || edges.length === 0} title={edges.length === 0 ? "Connect story nodes before weaving a scene" : "Turn connected nodes into a draft scene"}>
              <FaFeatherAlt /> {weavingScene ? "Weaving…" : "Weave Scene"}
            </button>
            <button className="canvasToolBtn canvasSaveBtn" onClick={handleSaveCanvas}>
              <FaSave /> Save
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="canvasContainer">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
          >
            <Controls />
            <Background color="#e0e0e0" gap={20} size={1} />
          </ReactFlow>
        </div>

        {/* Add Node Panel */}
        {showAddPanel && (
          <div className="canvasPanel">
            <div className="canvasPanelHeader">
              <h3>Add Story Node</h3>
              <button onClick={() => setShowAddPanel(false)}>
                <MdOutlineClose />
              </button>
            </div>
            <div className="canvasPanelBody">
              <div className="canvasFormGroup">
                <label>Node Type</label>
                <div className="canvasNodeTypes">
                  {Object.entries(NODE_COLORS).map(([type, colors]) => (
                    <button
                      key={type}
                      className={`canvasNodeTypeBtn ${newNode.type === type ? "active" : ""}`}
                      style={{
                        borderColor: colors.border,
                        background: newNode.type === type ? colors.bg : "transparent",
                        color: newNode.type === type ? "white" : colors.border,
                      }}
                      onClick={() => setNewNode({ ...newNode, type })}
                    >
                      {type === "plot" && "📖 Plot"}
                      {type === "character" && "👤 Character"}
                      {type === "location" && "📍 Location"}
                      {type === "event" && "⚡ Event"}
                      {type === "idea" && "💡 Idea"}
                      {type === "ai" && "🤖 AI"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="canvasFormGroup">
                <label>Label</label>
                <input
                  value={newNode.label}
                  onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                  placeholder="e.g., Hero discovers the ancient map"
                  className="canvasInput"
                />
              </div>
              <div className="canvasFormGroup">
                <label>Details</label>
                <textarea
                  value={newNode.content}
                  onChange={(e) => setNewNode({ ...newNode, content: e.target.value })}
                  placeholder="Describe this element..."
                  className="canvasInput canvasTextarea"
                  rows={3}
                />
              </div>
              <button className="canvasAddNodeBtn" onClick={handleAddNode}>
                Add to Canvas
              </button>
            </div>
          </div>
        )}

        {/* Node Detail Panel */}
        {showNodeDetail && selectedNode && (
          <div className="canvasPanel canvasDetailPanel">
            <div className="canvasPanelHeader">
              <h3>
                {selectedNode.data.type === "character" && <MdPerson />}
                {selectedNode.data.type === "location" && <MdPlace />}
                {selectedNode.data.type === "event" && <MdTimeline />}
                {" "}{selectedNode.data.label}
              </h3>
              <button onClick={() => setShowNodeDetail(false)}>
                <MdOutlineClose />
              </button>
            </div>
            <div className="canvasPanelBody">
              <div className="nodeDetailType">
                <span
                  className="nodeTypeBadge"
                  style={{ background: NODE_COLORS[selectedNode.data.type]?.bg || NODE_COLORS.plot.bg }}
                >
                  {selectedNode.data.type}
                </span>
              </div>
              {selectedNode.data.content && (
                <p className="nodeDetailContent">{selectedNode.data.content}</p>
              )}
              <button
                className="nodeDeleteBtn"
                onClick={() => handleDeleteNode(selectedNode.id)}
              >
                <FaTrash /> Delete Node
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
