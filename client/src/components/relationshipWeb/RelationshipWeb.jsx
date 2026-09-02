import React, { useMemo } from "react";
import { Background, Controls, MarkerType, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./RelationshipWeb.css";

const edgeColor = relationship => {
  if ((relationship.tension || 0) >= Math.max(relationship.trust || 0, relationship.affection || 0)) return "#ef4444";
  if ((relationship.affection || 0) >= (relationship.trust || 0)) return "#dd2476";
  return "#6c63ff";
};

export default function RelationshipWeb({ data }) {
  const { nodes, edges } = useMemo(() => {
    const names = data?.characters || Array.from(new Set((data?.relationships || []).flatMap(item => [item.source, item.target])));
    const radius = Math.max(150, names.length * 28);
    const graphNodes = names.map((name, index) => {
      const angle = (index / Math.max(1, names.length)) * Math.PI * 2 - Math.PI / 2;
      return {
        id: name,
        position: { x: 270 + Math.cos(angle) * radius, y: 210 + Math.sin(angle) * radius },
        data: { label: name },
        style: {
          minWidth: 125,
          padding: "12px 15px",
          border: "2px solid #6c63ff",
          borderRadius: "50px",
          background: "linear-gradient(135deg, #ffffff, #f5f2ff)",
          color: "#332d5f",
          fontSize: "12px",
          fontWeight: 700,
          boxShadow: "0 5px 18px rgba(108,99,255,0.14)",
        },
      };
    });
    const graphEdges = (data?.relationships || []).map((relationship, index) => {
      const color = edgeColor(relationship);
      return {
        id: `relationship-${index}`,
        source: relationship.source,
        target: relationship.target,
        label: `${relationship.label || "connected"} · T${relationship.trust || 0} A${relationship.affection || 0} X${relationship.tension || 0}`,
        animated: (relationship.tension || 0) > 6,
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: 2 },
        labelStyle: { fill: color, fontSize: 9, fontWeight: 700 },
        labelBgStyle: { fill: "white", fillOpacity: 0.9 },
      };
    });
    return { nodes: graphNodes, edges: graphEdges };
  }, [data]);

  return (
    <div className="relationshipWeb">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable zoomOnScroll>
        <Background color="#ddd8f6" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
